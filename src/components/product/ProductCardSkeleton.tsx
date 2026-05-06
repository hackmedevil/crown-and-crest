/**
 * ProductCardSkeleton Component
 * 
 * Loading skeleton that matches ProductCard dimensions
 */
export default function ProductCardSkeleton() {
  return (
    <div className="group relative animate-pulse">
      {/* Image Skeleton */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-200 mb-3">
        {/* Badge Placeholder */}
        <div className="absolute top-2 left-2">
          <div className="w-12 h-6 bg-gray-300 rounded" />
        </div>
        
        {/* Wishlist Button Placeholder */}
        <div className="absolute top-2 right-2">
          <div className="w-9 h-9 bg-gray-300 rounded-full" />
        </div>
      </div>

      {/* Product Info Skeleton */}
      <div className="space-y-2">
        {/* Rating Skeleton */}
        <div className="flex items-center gap-1">
          <div className="w-16 h-4 bg-gray-200 rounded" />
        </div>

        {/* Brand Skeleton */}
        <div className="w-20 h-3 bg-gray-200 rounded" />

        {/* Title Skeleton */}
        <div className="space-y-1">
          <div className="w-full h-4 bg-gray-200 rounded" />
          <div className="w-3/4 h-4 bg-gray-200 rounded" />
        </div>

        {/* Price Skeleton */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-5 bg-gray-200 rounded" />
          <div className="w-12 h-4 bg-gray-200 rounded" />
          <div className="w-14 h-4 bg-gray-200 rounded" />
        </div>

        {/* Color Variants Skeleton */}
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
        </div>

        {/* Delivery Message Skeleton */}
        <div className="w-32 h-4 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

/**
 * ProductGridSkeleton Component
 * 
 * Grid of skeleton cards for initial loading
 */
export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
