export default function CategoryGridSkeleton() {
  return (
    <section className="py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-3 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 mx-auto animate-pulse" />
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="group animate-pulse">
              {/* Image skeleton */}
              <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden mb-3">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 shimmer" />
              </div>
              
              {/* Category name skeleton */}
              <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
