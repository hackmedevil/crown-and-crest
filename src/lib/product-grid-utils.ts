/**
 * Product Grid Utilities
 * 
 * Helper functions for transforming product data
 */

import type { Product } from '@/types/product'
import type { GridProduct } from '@/types/grid'

/**
 * Transform a standard Product to GridProduct format
 * 
 * @param product - Product from database
 * @param options - Additional grid-specific data
 */
export function toGridProduct(
  product: Product,
  options?: {
    brand?: string
    rating?: number
    review_count?: number
    discount_percentage?: number
    is_new?: boolean
    is_bestseller?: boolean
    is_on_sale?: boolean
    color_variants?: Array<{
      id: string
      color: string
      color_code?: string
      image_url?: string
      slug?: string
    }>
    delivery_message?: string
    hover_image_url?: string
    mrp?: number
  }
): GridProduct {
  return {
    ...product,
    brand: options?.brand,
    rating: options?.rating,
    review_count: options?.review_count,
    discount_percentage: options?.discount_percentage,
    is_new: options?.is_new || false,
    is_bestseller: options?.is_bestseller || false,
    is_on_sale: options?.is_on_sale || false,
    color_variants: options?.color_variants,
    delivery_message: options?.delivery_message || 'Free Delivery',
    hover_image_url: options?.hover_image_url || (product.media?.[1]?.cloudinary_public_id 
      ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_400,h_500,q_auto,f_auto/${product.media[1].cloudinary_public_id}`
      : undefined),
    mrp: options?.mrp
  }
}

/**
 * Batch transform multiple products
 */
export function toGridProducts(
  products: Product[],
  optionsMap?: Map<string, Parameters<typeof toGridProduct>[1]>
): GridProduct[] {
  return products.map(product => 
    toGridProduct(product, optionsMap?.get(product.id))
  )
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(originalPrice: number, salePrice: number): number {
  if (originalPrice <= salePrice) return 0
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100)
}

/**
 * Determine if product is new (created within last N days)
 */
export function isNewProduct(createdAt: string, daysThreshold = 14): boolean {
  const created = new Date(createdAt)
  const now = new Date()
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  return daysDiff <= daysThreshold
}

/**
 * Format delivery message based on logistics
 */
export function getDeliveryMessage(
  options: {
    isFreeShipping?: boolean
    estimatedDays?: number
    isPincodeCovered?: boolean
  }
): string {
  if (!options.isPincodeCovered) {
    return 'Check delivery availability'
  }

  if (options.isFreeShipping) {
    if (options.estimatedDays && options.estimatedDays <= 2) {
      return 'Free Express Delivery'
    }
    return 'Free Delivery'
  }

  if (options.estimatedDays) {
    return `Delivery in ${options.estimatedDays} days`
  }

  return 'Standard Delivery'
}

/**
 * Generate color variants from product variants
 */
export function extractColorVariants(
  variants: Array<{ id: string; color?: string; images?: Array<{ url: string }> }>,
  productSlug: string
): GridProduct['color_variants'] {
  const colorMap = new Map<string, { id: string; color: string; color_code?: string; image_url?: string; slug?: string }>()

  variants.forEach(variant => {
    if (variant.color && !colorMap.has(variant.color)) {
      colorMap.set(variant.color, {
        id: variant.id,
        color: variant.color,
        image_url: variant.images?.[0]?.url,
        slug: `${productSlug}?color=${encodeURIComponent(variant.color)}`
      })
    }
  })

  return Array.from(colorMap.values())
}

/**
 * Sort products by various criteria
 */
export function sortProducts(
  products: GridProduct[],
  sortBy: 'newest' | 'price-low' | 'price-high' | 'rating' | 'popularity'
): GridProduct[] {
  const sorted = [...products]

  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
    
    case 'price-low':
      return sorted.sort((a, b) => a.base_price - b.base_price)
    
    case 'price-high':
      return sorted.sort((a, b) => b.base_price - a.base_price)
    
    case 'rating':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0))
    
    case 'popularity':
      // Sort by review count as proxy for popularity
      return sorted.sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
    
    default:
      return sorted
  }
}

/**
 * Filter products by price range
 */
export function filterByPriceRange(
  products: GridProduct[],
  min: number,
  max: number
): GridProduct[] {
  return products.filter(p => p.base_price >= min && p.base_price <= max)
}

/**
 * Filter products by availability
 */
export function filterByAvailability(
  products: GridProduct[],
  inStock = true
): GridProduct[] {
  return products.filter(p => (inStock ? p.active !== false : p.active === false))
}

/**
 * Get price range from products
 */
export function getPriceRange(products: GridProduct[]): { min: number; max: number } {
  if (products.length === 0) return { min: 0, max: 0 }

  const prices = products.map(p => p.base_price)
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  }
}
