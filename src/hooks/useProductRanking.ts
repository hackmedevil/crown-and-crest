/**
 * useProductRanking Hook
 * 
 * React hook for fetching and managing ranked products
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  searchWithRanking,
  getCategoryRanked,
  getTrendingProducts,
  SortOption,
  RankedProduct,
  SORT_OPTIONS,
} from '@/lib/ranking'

export interface UseProductRankingOptions {
  categoryId?: string
  query?: string
  sortBy?: SortOption
  minPrice?: number
  maxPrice?: number
  pageSize?: number
  autoFetch?: boolean
}

export interface RankingHookState {
  products: RankedProduct[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  sortBy: SortOption
}

const DEFAULT_PAGE_SIZE = 24

/**
 * Hook for fetching category products with ranking
 */
export function useCategoryRanking(
  categoryId: string | undefined,
  options: UseProductRankingOptions = {}
) {
  const {
    sortBy = 'ranking',
    minPrice,
    maxPrice,
    pageSize = DEFAULT_PAGE_SIZE,
    autoFetch = true,
  } = options

  const [state, setState] = useState<RankingHookState>({
    products: [],
    total: 0,
    page: 1,
    pageSize,
    loading: false,
    error: null,
    sortBy,
  })

  const fetchProducts = useCallback(
    async (page: number = 1) => {
      if (!categoryId) return

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const response = await getCategoryRanked(categoryId, {
          sortBy,
          minPrice,
          maxPrice,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        })

        setState(prev => ({
          ...prev,
          products: response.results,
          total: response.pagination?.total || 0,
          page,
          loading: false,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to fetch products',
          loading: false,
        }))
      }
    },
    [categoryId, sortBy, minPrice, maxPrice, pageSize]
  )

  useEffect(() => {
    if (autoFetch) {
      fetchProducts(1)
    }
  }, [autoFetch, fetchProducts])

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= Math.ceil(state.total / state.pageSize)) {
        fetchProducts(page)
      }
    },
    [state.total, state.pageSize, fetchProducts]
  )

  const changeSortBy = useCallback(
    (newSort: SortOption) => {
      setState(prev => ({ ...prev, sortBy: newSort }))
      fetchProducts(1)
    },
    [fetchProducts]
  )

  return {
    ...state,
    goToPage,
    changeSortBy,
    refetch: () => fetchProducts(state.page),
  }
}

/**
 * Hook for searching products with ranking
 */
export function useRankingSearch(
  query: string | undefined,
  options: UseProductRankingOptions = {}
) {
  const {
    sortBy = 'ranking',
    minPrice,
    maxPrice,
    pageSize = DEFAULT_PAGE_SIZE,
    autoFetch = true,
  } = options

  const [state, setState] = useState<RankingHookState>({
    products: [],
    total: 0,
    page: 1,
    pageSize,
    loading: false,
    error: null,
    sortBy,
  })

  const fetchResults = useCallback(
    async (page: number = 1) => {
      if (!query || query.length < 2) {
        setState(prev => ({ ...prev, products: [], total: 0 }))
        return
      }

      setState(prev => ({ ...prev, loading: true, error: null }))

      try {
        const response = await searchWithRanking(query, {
          minPrice,
          maxPrice,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        })

        setState(prev => ({
          ...prev,
          products: response.results,
          total: response.pagination?.total || 0,
          page,
          loading: false,
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Search failed',
          loading: false,
        }))
      }
    },
    [query, minPrice, maxPrice, pageSize]
  )

  useEffect(() => {
    if (autoFetch && query) {
      fetchResults(1)
    }
  }, [autoFetch, query, fetchResults])

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= Math.ceil(state.total / state.pageSize)) {
        fetchResults(page)
      }
    },
    [state.total, state.pageSize, fetchResults]
  )

  return {
    ...state,
    goToPage,
    refetch: () => fetchResults(state.page),
  }
}

/**
 * Hook for fetching trending products
 */
export function useTrendingProducts(
  categoryId?: string,
  limit?: number
) {
  const [products, setProducts] = useState<RankedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true)
      setError(null)

      try {
        const response = await getTrendingProducts({
          category: categoryId,
          limit: limit || 10,
        })

        setProducts(response.results)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch trending products')
      } finally {
        setLoading(false)
      }
    }

    fetchTrending()
  }, [categoryId, limit])

  return {
    products,
    loading,
    error,
  }
}

/**
 * Hook for managing sort state with UI updates
 */
export function useSortingUI(initialSort: SortOption = 'ranking') {
  const [sortBy, setSortBy] = useState<SortOption>(initialSort)

  const sortOptions = Object.values(SORT_OPTIONS)

  const getSortLabel = (sort: SortOption) => {
    const option = Object.values(SORT_OPTIONS).find(o => o.value === sort)
    return option?.label || 'Best Match'
  }

  return {
    sortBy,
    setSortBy,
    sortOptions,
    getSortLabel,
    currentSortOption: Object.values(SORT_OPTIONS).find(o => o.value === sortBy),
  }
}
