/**
 * Analytics Events Module
 * 
 * Handles tracking of all ecommerce events (view, search, add-to-cart, purchase, etc.)
 * Logs to both database and GA4 for complete visibility
 * 
 * Usage:
 * import { trackEvent } from '@/lib/analytics/events'
 * trackEvent('add_to_cart', { productId: '123', price: 999 })
 */

import { createClient } from '@supabase/supabase-js'

export type EventType =
  | 'view_homepage'
  | 'view_shop'
  | 'view_product'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'purchase'
  | 'purchase_refund'
  | 'search'
  | 'filter_used'
  | 'view_category'

interface EventMetadata {
  productId?: string
  productName?: string
  category?: string
  price?: number
  quantity?: number
  cartValue?: number
  searchQuery?: string
  filterId?: string
  filterValue?: string
  orderId?: string
  orderValue?: number
  paymentMethod?: string
  [key: string]: any
}

interface TrackEventOptions {
  userId?: string
  sessionId?: string
  metadata?: EventMetadata
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

/**
 * Track an ecommerce event
 * Logs to database and GA4 simultaneously
 */
export async function trackEvent(
  eventType: EventType,
  options: TrackEventOptions = {}
): Promise<void> {
  try {
    const { userId, sessionId, metadata = {} } = options

    // Log to database (fire and forget)
    if (typeof window === 'undefined') {
      // Server-side: use service role client
      const serverSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      serverSupabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          user_id: userId,
          product_id: metadata.productId,
          metadata: metadata,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error('Failed to log event:', error)
        })
    } else {
      // Client-side: use public client
      supabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          user_id: userId,
          product_id: metadata.productId,
          metadata: metadata,
          session_id: sessionId,
          created_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error('Failed to log event:', error)
        })
    }

    // Send to GA4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const gaEvent = getGAEventData(eventType, metadata)
      ;(window as any).gtag('event', gaEvent.name, gaEvent.params)
    }
  } catch (error) {
    console.error('Error tracking event:', error)
  }
}

/**
 * Convert our event type to GA4 event parameters
 */
function getGAEventData(
  eventType: EventType,
  metadata: EventMetadata
): {
  name: string
  params: Record<string, any>
} {
  const baseParams = {
    timestamp: new Date().getTime(),
  }

  switch (eventType) {
    case 'view_product':
      return {
        name: 'view_item',
        params: {
          ...baseParams,
          items: [
            {
              item_id: metadata.productId,
              item_name: metadata.productName,
              item_category: metadata.category,
              price: metadata.price,
              currency: 'INR',
            },
          ],
        },
      }

    case 'add_to_cart':
      return {
        name: 'add_to_cart',
        params: {
          ...baseParams,
          items: [
            {
              item_id: metadata.productId,
              item_name: metadata.productName,
              item_category: metadata.category,
              price: metadata.price,
              quantity: metadata.quantity,
              currency: 'INR',
            },
          ],
          value: metadata.cartValue,
        },
      }

    case 'remove_from_cart':
      return {
        name: 'remove_from_cart',
        params: {
          ...baseParams,
          items: [
            {
              item_id: metadata.productId,
              item_name: metadata.productName,
              item_category: metadata.category,
              price: metadata.price,
              quantity: metadata.quantity,
              currency: 'INR',
            },
          ],
          value: metadata.cartValue,
        },
      }

    case 'view_cart':
      return {
        name: 'view_cart',
        params: {
          ...baseParams,
          value: metadata.cartValue,
          currency: 'INR',
        },
      }

    case 'begin_checkout':
      return {
        name: 'begin_checkout',
        params: {
          ...baseParams,
          value: metadata.cartValue,
          currency: 'INR',
        },
      }

    case 'add_shipping_info':
      return {
        name: 'add_shipping_info',
        params: {
          ...baseParams,
          currency: 'INR',
        },
      }

    case 'add_payment_info':
      return {
        name: 'add_payment_info',
        params: {
          ...baseParams,
          payment_type: metadata.paymentMethod,
          currency: 'INR',
        },
      }

    case 'purchase':
      return {
        name: 'purchase',
        params: {
          ...baseParams,
          transaction_id: metadata.orderId,
          value: metadata.orderValue,
          currency: 'INR',
          coupon: metadata.coupon || '',
          shipping: metadata.shippingCost || 0,
          tax: metadata.taxAmount || 0,
        },
      }

    case 'search':
      return {
        name: 'search',
        params: {
          ...baseParams,
          search_term: metadata.searchQuery,
        },
      }

    case 'filter_used':
      return {
        name: 'view_item_list',
        params: {
          ...baseParams,
          item_category: metadata.category,
          items: [],
        },
      }

    case 'view_category':
      return {
        name: 'view_item_list',
        params: {
          ...baseParams,
          item_category: metadata.category,
          items: [],
        },
      }

    case 'view_homepage':
    case 'view_shop':
    default:
      return {
        name: 'page_view',
        params: {
          ...baseParams,
          page_title: eventType,
        },
      }
  }
}

/**
 * Track a user's product view
 * Usage: trackProductView(productId, productName, category, price)
 */
export function trackProductView(
  productId: string,
  productName: string,
  category: string,
  price: number,
  userId?: string
): void {
  trackEvent('view_product', {
    userId,
    metadata: {
      productId,
      productName,
      category,
      price,
    },
  })
}

/**
 * Track add to cart event with product details
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number,
  category: string,
  cartValue: number,
  userId?: string
): void {
  trackEvent('add_to_cart', {
    userId,
    metadata: {
      productId,
      productName,
      price,
      quantity,
      category,
      cartValue,
    },
  })
}

/**
 * Track purchase event with full order details
 */
export function trackPurchase(
  orderId: string,
  orderValue: number,
  items: Array<{ id: string; name: string; price: number; quantity: number; category: string }>,
  paymentMethod: string,
  userId?: string,
  shippingCost = 0,
  taxAmount = 0
): void {
  trackEvent('purchase', {
    userId,
    metadata: {
      orderId,
      orderValue,
      paymentMethod,
      shippingCost,
      taxAmount,
      itemCount: items.length,
      // Send first item as primary (GA4 requirement)
      productId: items[0]?.id,
      productName: items[0]?.name,
      category: items[0]?.category,
    },
  })
}

/**
 * Track search query
 */
export function trackSearch(query: string, resultsCount: number, userId?: string): void {
  trackEvent('search', {
    userId,
    metadata: {
      searchQuery: query,
      resultsCount,
    },
  })
}

/**
 * Track filter usage
 */
export function trackFilter(
  filterId: string,
  filterValue: string,
  category: string,
  userId?: string
): void {
  trackEvent('filter_used', {
    userId,
    metadata: {
      filterId,
      filterValue,
      category,
    },
  })
}
