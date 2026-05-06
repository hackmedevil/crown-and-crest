export default function HeroSkeleton() {
  return (
    <section className="relative h-[500px] md:h-[600px] lg:h-[700px] bg-gray-200 overflow-hidden animate-pulse">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 shimmer" />
      
      {/* Content skeleton */}
      <div className="relative h-full flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="h-12 bg-gray-300 rounded w-96 mx-auto" />
          <div className="h-6 bg-gray-300 rounded w-64 mx-auto" />
          <div className="h-12 bg-gray-300 rounded w-40 mx-auto mt-6" />
        </div>
      </div>
      
      {/* Navigation dots skeleton */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-gray-300" />
        ))}
      </div>
    </section>
  )
}
