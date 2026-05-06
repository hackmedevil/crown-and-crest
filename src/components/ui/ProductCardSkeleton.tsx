import React from 'react'

export default function ProductCardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* Image container */}
      <div className="aspect-square bg-neutral-200 rounded-lg" />
      
      {/* Name skeleton */}
      <div className="h-4 bg-neutral-200 rounded w-3/4" />
      
      {/* Category skeleton */}
      <div className="h-3 bg-neutral-200 rounded w-1/2" />
      
      {/* Price and rating skeleton */}
      <div className="flex items-center justify-between pt-2">
        <div className="h-5 bg-neutral-200 rounded w-1/3" />
        <div className="h-4 bg-neutral-200 rounded w-1/4" />
      </div>
    </div>
  )
}
