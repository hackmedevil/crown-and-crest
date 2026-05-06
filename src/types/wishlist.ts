/**
 * Wishlist Types
 *
 * Type definitions for wishlist system with alert tracking and analytics.
 */

export interface WishlistItem {
  id: string
  firebase_uid: string
  product_id: string
  price_alert: boolean
  stock_alert: boolean
  created_at: string
}

export interface WishlistItemWithProduct extends WishlistItem {
  product: {
    id: string
    name: string
    slug: string
    description?: string
    images: Array<{ url: string; alt?: string }> | string[] // Handle both JSONB formats
    base_price: number // Price in paise
    category: string
  }
  variant?: {
    id: string
    size?: string
    color?: string
    stock_quantity: number
    low_stock_threshold: number
  }
  priceDropped?: boolean
  priceDropAmount?: number // in paise
  isLowStock?: boolean
  isOutOfStock?: boolean
  stockAlertEligible?: boolean // Can set stock alert
}

export interface WishlistStats {
  totalItems: number
  itemsOnAlert: number
  itemsLowStock: number
  itemsPriceDropped: number
  estimatedSavings: number // in paise
}

export interface WishlistAlert {
  type: 'low_stock' | 'price_drop' | 'back_in_stock'
  productId: string
  productName: string
  message: string
  action?: {
    label: string
    href: string
  }
}

export interface RecommendedProduct {
  id: string
  name: string
  slug: string
  images: Array<{ url: string; alt?: string }> | string[]
  base_price: number
  category: string
  reason: 'similar_category' | 'frequently_bought_together' | 'trending'
  discount?: number // percentage
}

export interface WishlistShare {
  id: string
  firebase_uid: string
  token: string
  expiry_date: string | null
  created_at: string
  viewed_count: number
}
