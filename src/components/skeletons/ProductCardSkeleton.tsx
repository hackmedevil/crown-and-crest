export default function ProductCardSkeleton() {
  return (
    <div className="group animate-pulse">
      {/* Image skeleton */}
      <div className="relative aspect-square bg-gray-200 rounded-lg mb-3 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 shimmer" />
      </div>

      {/* Product info skeleton */}
      <div className="space-y-2">
        {/* Title skeleton */}
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        
        {/* Price skeleton */}
        <div className="h-5 bg-gray-200 rounded w-1/2" />
        
        {/* Rating skeleton (optional) */}
        <div className="flex items-center gap-1">
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  )
}
