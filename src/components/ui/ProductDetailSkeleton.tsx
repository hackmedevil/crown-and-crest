import React from 'react'

export default function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12 animate-pulse">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image gallery skeleton */}
        <div className="space-y-4">
          <div className="aspect-square bg-neutral-200 rounded-lg" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-neutral-200 rounded" />
            ))}
          </div>
        </div>

        {/* Details skeleton */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <div className="h-6 bg-neutral-200 rounded w-3/4" />
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-20 bg-neutral-200 rounded" />
            <div className="h-4 w-16 bg-neutral-200 rounded" />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <div className="h-6 bg-neutral-200 rounded w-1/4" />
            <div className="h-4 bg-neutral-200 rounded w-1/3" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 bg-neutral-200 rounded" />
            <div className="h-4 bg-neutral-200 rounded" />
            <div className="h-4 bg-neutral-200 rounded w-3/4" />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="h-10 bg-neutral-200 rounded" />
            <div className="h-10 bg-neutral-200 rounded" />
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            <div className="h-12 bg-neutral-200 rounded" />
            <div className="h-12 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
