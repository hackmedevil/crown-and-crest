import React from 'react'

export default function CartItemSkeleton() {
  return (
    <div className="flex gap-4 pb-6 border-b border-neutral-200 animate-pulse">
      {/* Image */}
      <div className="w-24 h-24 bg-neutral-200 rounded-lg flex-shrink-0" />
      
      {/* Content */}
      <div className="flex-1 space-y-3">
        {/* Product name */}
        <div className="h-4 bg-neutral-200 rounded w-3/4" />
        
        {/* SKU/Details */}
        <div className="h-3 bg-neutral-200 rounded w-1/2" />
        
        {/* Price */}
        <div className="h-4 bg-neutral-200 rounded w-1/4 mt-4" />
      </div>
      
      {/* Quantity controls */}
      <div className="flex flex-col items-end gap-2">
        <div className="h-8 w-24 bg-neutral-200 rounded" />
        <div className="h-4 bg-neutral-200 rounded w-16" />
      </div>
    </div>
  )
}
