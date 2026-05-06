'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GridProduct } from '@/types/grid'

interface UseProductsOptions {
  /**
   * Initial cursor for pagination
   */
  initialCursor?: string
  
  /**
   * Number of products per page
   */
  pageSize?: number
  
  /**
   * API endpoint for fetching products
   */
  endpoint?: string
  
  /**
   * Whether to fetch on mount
   */
  autoFetch?: boolean
}

interface UseProductsReturn {
  products: GridProduct[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
}

/**
 * useProducts Hook
 * 
 * Manages product fetching with infinite scroll pagination
 * Uses cursor-based pagination for efficient data loading
 */
export function useProducts({
  initialCursor = new Date().toISOString(),
  pageSize = 12,
  endpoint = '/api/products',
  autoFetch = true
}: UseProductsOptions = {}): UseProductsReturn {
  const [products, setProducts] = useState<GridProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState(true)

  const fetchProducts = useCallback(async (currentCursor: string | null, append = false) => {
    if (!currentCursor || loading) return

    setLoading(true)
    setError(null)

    try {
      const url = `${endpoint}?cursor=${encodeURIComponent(currentCursor)}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }

      const data = await response.json()
      
      setProducts((prev) => append ? [...prev, ...data.products] : data.products)
      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching products:', err)
    } finally {
      setLoading(false)
    }
  }, [endpoint, loading])

  // Load more products (for infinite scroll)
  const loadMore = useCallback(() => {
    if (cursor && hasMore && !loading) {
      void fetchProducts(cursor, true)
    }
  }, [cursor, hasMore, loading, fetchProducts])

  // Refresh products (reset to initial state)
  const refresh = useCallback(() => {
    setProducts([])
    setCursor(initialCursor)
    setHasMore(true)
    void fetchProducts(initialCursor, false)
  }, [initialCursor, fetchProducts])

  // Initial fetch
  useEffect(() => {
    if (autoFetch && products.length === 0) {
      void fetchProducts(initialCursor, false)
    }
  }, [autoFetch, initialCursor, fetchProducts, products.length])

  return {
    products,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  }
}
