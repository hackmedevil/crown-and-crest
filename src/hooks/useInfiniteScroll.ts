'use client'

import { useEffect, useRef, useCallback } from 'react'

interface UseInfiniteScrollOptions {
  /**
   * Callback to load more items
   */
  onLoadMore: () => void
  
  /**
   * Whether there are more items to load
   */
  hasMore: boolean
  
  /**
   * Whether currently loading
   */
  isLoading: boolean
  
  /**
   * Root margin for intersection observer (default: '200px')
   */
  rootMargin?: string
  
  /**
   * Threshold for intersection observer (default: 0)
   */
  threshold?: number
  
  /**
   * Whether infinite scroll is enabled (default: true)
   */
  enabled?: boolean
}

/**
 * useInfiniteScroll Hook
 * 
 * Implements infinite scroll using IntersectionObserver
 * Loads more items when sentinel element comes into view
 * 
 * @returns ref to attach to sentinel element
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '200px',
  threshold = 0,
  enabled = true
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries

      // Load more if:
      // - Sentinel is visible
      // - Not currently loading
      // - Has more items
      // - Feature is enabled
      if (entry.isIntersecting && !isLoading && hasMore && enabled) {
        onLoadMore()
      }
    },
    [onLoadMore, isLoading, hasMore, enabled]
  )

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !enabled) return

    const observer = new IntersectionObserver(handleIntersect, {
      root: null, // viewport
      rootMargin,
      threshold
    })

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [handleIntersect, rootMargin, threshold, enabled])

  return sentinelRef
}
