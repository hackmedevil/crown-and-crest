import React from 'react'

export default function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="rounded-xl bg-neutral-100 h-0" style={{ paddingBottom: '125%' }} />
      <div className="mt-3 h-3 rounded bg-neutral-100 w-3/4" />
      <div className="mt-2 h-3 rounded bg-neutral-100 w-1/2" />
    </div>
  )
}
