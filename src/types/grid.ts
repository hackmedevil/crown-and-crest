/**
 * Product Grid Types
 * Types for the product listing and grid system
 */

import type { Product, ProductMedia } from './product'

export interface GridProduct extends Product {
  // Extended product data for grid display
  brand?: string
  rating?: number
  review_count?: number
  discount_percentage?: number
  is_new?: boolean
  is_bestseller?: boolean
  is_on_sale?: boolean
  color_variants?: ColorVariant[]
  delivery_message?: string
  hover_image_url?: string
  mrp?: number
}

export interface ColorVariant {
  id: string
  color: string
  color_code?: string
  image_url?: string
  slug?: string
}

export interface ProductCardProps {
  product: GridProduct
  priority?: boolean
  onWishlistToggle?: (productId: string, isWishlisted: boolean) => void
  onQuickAdd?: (productId: string, size?: string) => void
  prefetchOnHover?: boolean
}

export interface ProductGridProps {
  products: GridProduct[]
  loading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  columns?: {
    mobile: number
    tablet: number
    desktop: number
  }
}

export interface InfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  enabled?: boolean
}
