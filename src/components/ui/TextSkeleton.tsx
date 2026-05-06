import React from 'react'

interface TextSkeletonProps {
  lines?: number
  className?: string
  widths?: number[]
}

export default function TextSkeleton({ 
  lines = 1, 
  className = '',
  widths = [] 
}: TextSkeletonProps) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => {
        const width = widths[i] ? `${widths[i]}%` : i === lines - 1 ? '75%' : '100%'
        return (
          <div
            key={i}
            className="h-4 bg-neutral-200 rounded"
            style={{ width }}
          />
        )
      })}
    </div>
  )
}
