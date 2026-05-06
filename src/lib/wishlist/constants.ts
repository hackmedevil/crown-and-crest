/**
 * Wishlist Constants & Helpers
 *
 * Configurations, labels, and utility functions for the wishlist system.
 */

import { WishlistAlert } from '@/types/wishlist'

export const WISHLIST_CONFIG = {
  maxItems: 50,
  alertCheckIntervalDays: 7,
  priceDropThresholdPercent: 5, // Notify if price drops by 5% or more
  stockAlertThreshold: 5, // Notify if stock drops below 5
  recommendationLimit: 4,
}

/**
 * Format currency to INR with ₹ symbol
 */
export function formatPrice(amountPaise: number): string {
  return `₹${(amountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

/**
 * Calculate savings between two prices
 */
export function calculateSavings(originalPaise: number, newPaise: number): {
  amount: number
  percentage: number
} {
  const amount = originalPaise - newPaise
  const percentage = Math.round((amount / originalPaise) * 100)
  return { amount, percentage }
}

/**
 * Get alert urgency level
 */
export function getAlertUrgency(alert: WishlistAlert): 'high' | 'medium' | 'low' {
  if (alert.type === 'price_drop') return 'high'
  if (alert.type === 'low_stock') return 'high'
  return 'medium'
}

/**
 * Get stock status text
 */
export function getStockStatus(
  quantity: number,
  threshold: number = 5
): {
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  text: string
  badge?: {
    label: string
    color: string
  }
} {
  if (quantity === 0) {
    return {
      status: 'out_of_stock',
      text: 'Out of Stock',
      badge: { label: 'OUT OF STOCK', color: 'bg-red-900' },
    }
  }

  if (quantity <= threshold) {
    return {
      status: 'low_stock',
      text: `Only ${quantity} left`,
      badge: { label: `ONLY ${quantity} LEFT`, color: 'bg-yellow-900' },
    }
  }

  return {
    status: 'in_stock',
    text: 'In Stock',
  }
}

/**
 * Get price drop display
 */
export function getPriceDropDisplay(originalPaise: number, currentPaise: number): string | null {
  if (currentPaise >= originalPaise) return null

  const { amount, percentage } = calculateSavings(originalPaise, currentPaise)
  if (percentage < WISHLIST_CONFIG.priceDropThresholdPercent) return null

  return `PRICE DROPPED ${formatPrice(amount)}`
}

/**
 * Get recommendation reason label
 */
export function getRecommendationReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    similar_category: 'Similar Style',
    frequently_bought_together: 'Frequently Bought Together',
    trending: 'Trending Now',
  }
  return labels[reason] || 'Recommended'
}

/**
 * Validate email for wishlist sharing
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Get empty state message based on context
 */
export function getEmptyStateMessage(context: 'empty' | 'no_alerts' | 'no_recommendations'): {
  title: string
  subtitle: string
  cta?: { label: string; href: string }
} {
  const messages = {
    empty: {
      title: 'YOUR WISHLIST IS EMPTY.',
      subtitle: 'Start saving your favorite pieces.',
      cta: { label: 'SHOP NEW ARRIVALS', href: '/shop' },
    },
    no_alerts: {
      title: 'NO ALERTS YET',
      subtitle: 'Enable price or stock alerts to stay updated.',
    },
    no_recommendations: {
      title: 'NO RECOMMENDATIONS',
      subtitle: 'Check back soon for personalized suggestions.',
    },
  }

  return messages[context]
}

/**
 * Generate wishlist share URL
 */
export function generateWishlistShareUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/account/wishlist/shared/${token}`
}

/**
 * Format wishlist item count with text
 */
export function formatWishlistCount(count: number): string {
  if (count === 0) return 'Empty'
  if (count === 1) return '1 Item'
  return `${count} Items`
}

/**
 * Mobile swipe detection (for swipe-to-remove on mobile)
 */
export const SWIPE_CONFIG = {
  minDistancePx: 50, // Minimum distance to trigger swipe action
  maxDurationMs: 500, // Maximum duration to be considered a swipe
}

/**
 * Analytics event names
 */
export const WISHLIST_EVENTS = {
  VIEW_WISHLIST: 'wishlist_view',
  ADD_ITEM: 'wishlist_add_item',
  REMOVE_ITEM: 'wishlist_remove_item',
  CLEAR_ALL: 'wishlist_clear_all',
  TOGGLE_ALERT: 'wishlist_toggle_alert',
  ADD_TO_CART_FROM_WISHLIST: 'wishlist_add_to_cart',
  SHARE_WISHLIST: 'wishlist_share',
  VIEW_SHARED_WISHLIST: 'wishlist_view_shared',
}

/**
 * Default product images to use if not available
 */
export function getDefaultImage(): string {
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f3f3f3" width="400" height="400"/%3E%3C/svg%3E'
}
