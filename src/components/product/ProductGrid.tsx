'use client'

import { memo } from 'react'
import ProductCard from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import type { GridProduct } from '@/types/grid'

interface ProductGridProps {
  /**
   * Array of products to display
   */
  products: GridProduct[]
  
  /**
   * Whether products are currently loading
   */
  loading?: boolean
  
  /**
   * Callback to load more products
   */
  onLoadMore?: () => void
  
  /**
   * Whether there are more products to load
   */
  hasMore?: boolean
  
  /**
   * Number of columns per breakpoint
   */
  columns?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  
  /**
   * Callback when wishlist is toggled
   */
  onWishlistToggle?: (productId: string, isWishlisted: boolean) => void
  
  /**
   * Callback for quick add to cart
   */
  onQuickAdd?: (productId: string, size?: string) => void
  
  /**
   * Whether to enable product page prefetch on hover
   */
  prefetchOnHover?: boolean
  
  /**
   * Number of skeleton loaders to show
   */
  skeletonCount?: number
}

/**
 * ProductGrid Component
 * 
 * High-performance responsive grid for displaying products
 * Features:
 * - Responsive grid layout (2/3/4 columns)
 * - Infinite scroll support
 * - Skeleton loading states
 * - Optimized rendering with React.memo
 * - Flexible column configuration
 */
function ProductGrid({
  products,
  loading = false,
  onLoadMore,
  hasMore = false,
  columns = {
    mobile: 2,
    tablet: 3,
    desktop: 4
  },
  onWishlistToggle,
  onQuickAdd,
  prefetchOnHover = true,
  skeletonCount = 12
}: ProductGridProps) {
  // Infinite scroll setup
  const sentinelRef = useInfiniteScroll({
    onLoadMore: onLoadMore || (() => {}),
    hasMore,
    isLoading: loading,
    rootMargin: '200px',
    enabled: !!onLoadMore && hasMore
  })

  // Map column counts to Tailwind classes
  // Tailwind doesn't support dynamic class names, so we use a mapping
  const colClassMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  }

  const tabletColClassMap: Record<number, string> = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6'
  }

  const desktopColClassMap: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6'
  }

  const gridClasses = `grid ${colClassMap[columns.mobile || 2]} ${tabletColClassMap[columns.tablet || 3]} ${desktopColClassMap[columns.desktop || 4]} gap-4 md:gap-6`

  return (
    <div className="w-full">
      {/* Product Grid */}
      {products.length > 0 && (
        <div className={gridClasses}>
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 8} // Prioritize first 8 images
              onWishlistToggle={onWishlistToggle}
              onQuickAdd={onQuickAdd}
              prefetchOnHover={prefetchOnHover}
            />
          ))}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && products.length === 0 && (
        <div className={gridClasses}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <ProductCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      )}

      {/* Load More Skeleton (during infinite scroll) */}
      {loading && products.length > 0 && (
        <div className={`${gridClasses} mt-6`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={`loading-skeleton-${index}`} />
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {onLoadMore && hasMore && !loading && (
        <div
          ref={sentinelRef}
          className="h-20 flex items-center justify-center"
          aria-hidden="true"
        />
      )}

      {/* No More Products Message */}
      {!hasMore && products.length > 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">You&apos;ve reached the end of the collection</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && products.length === 0 && (
        <div className="text-center py-20">
          <p className="text-lg text-gray-500">No products found</p>
        </div>
      )}
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(ProductGrid)
