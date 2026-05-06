/**
 * Ranking System Utilities
 * 
 * Client-side utilities for interacting with the product ranking system
 */

export type SortOption = 'ranking' | 'price_asc' | 'price_desc' | 'newest' | 'rating'

export interface RankedProduct {
  id: string
  name: string
  slug: string
  basePrice: number
  rating?: number
  reviewCount?: number
  imageUrl?: string
  rankingScore: number
  searchRank?: number
  views24h?: number
  trendingRank?: number
}

export interface RankingResponse<T = RankedProduct> {
  results: T[]
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  query?: string
  sortBy?: SortOption
  category?: {
    id: string
    name: string
    slug: string
  }
  trending?: boolean
  timeframe?: string
  facets?: Record<string, any>
}

export interface ProductRankingDetails {
  productId: string
  productName: string
  rankingScore: number
  rankingPercentile: number
  lastUpdated: string
  signals: {
    purchases: SignalMetric
    views: SignalMetric
    conversionRate: ConversionMetric
    rating: SignalMetric
    recencyBoost: BoostMetric
    bestsellerBoost: BoostMetric
  }
  performance: {
    percentile: number
    interpretation: string
    recommendation: string
  }
}

interface SignalMetric {
  count?: number
  score?: number
  weight: number
  signal: number
  label: string
  description: string
}

interface ConversionMetric extends SignalMetric {
  rate: number
  isAboveAverage?: boolean
}

interface BoostMetric {
  boost: number
  label: string
  description: string
}

// --- Sorting Options ---

export const SORT_OPTIONS = {
  RANKING: {
    value: 'ranking' as const,
    label: 'Best Match',
    description: 'Ranked by relevance and quality',
  },
  NEWEST: {
    value: 'newest' as const,
    label: 'Newest',
    description: 'Recently added products',
  },
  PRICE_LOW: {
    value: 'price_asc' as const,
    label: 'Price: Low to High',
    description: 'Lowest price first',
  },
  PRICE_HIGH: {
    value: 'price_desc' as const,
    label: 'Price: High to Low',
    description: 'Highest price first',
  },
  RATING: {
    value: 'rating' as const,
    label: 'Top Rated',
    description: 'Highest customer ratings',
  },
}

// --- API Functions ---

/**
 * Search products with ranking
 */
export async function searchWithRanking(
  query: string,
  options?: {
    category?: string
    minPrice?: number
    maxPrice?: number
    limit?: number
    offset?: number
  }
): Promise<RankingResponse> {
  const params = new URLSearchParams()
  params.set('q', query)
  
  if (options?.category) params.set('category', options.category)
  if (options?.minPrice) params.set('minPrice', String(options.minPrice))
  if (options?.maxPrice) params.set('maxPrice', String(options.maxPrice))
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.offset) params.set('offset', String(options.offset))

  const response = await fetch(`/api/products/ranking/search?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Search failed')
  }
  
  return response.json()
}

/**
 * Get ranked products by category
 */
export async function getCategoryRanked(
  categoryId: string,
  options?: {
    sortBy?: SortOption
    minPrice?: number
    maxPrice?: number
    limit?: number
    offset?: number
  }
): Promise<RankingResponse> {
  const params = new URLSearchParams()
  params.set('categoryId', categoryId)
  
  if (options?.sortBy) params.set('sortBy', options.sortBy)
  if (options?.minPrice) params.set('minPrice', String(options.minPrice))
  if (options?.maxPrice) params.set('maxPrice', String(options.maxPrice))
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.offset) params.set('offset', String(options.offset))

  const response = await fetch(`/api/products/ranking/category?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Category ranking failed')
  }
  
  return response.json()
}

/**
 * Get trending products
 */
export async function getTrendingProducts(
  options?: {
    category?: string
    limit?: number
  }
): Promise<RankingResponse> {
  const params = new URLSearchParams()
  
  if (options?.category) params.set('category', options.category)
  if (options?.limit) params.set('limit', String(options.limit))

  const response = await fetch(`/api/products/ranking/trending?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error('Trending products request failed')
  }
  
  return response.json()
}

/**
 * Get product ranking details
 */
export async function getProductRankingDetails(
  productId: string
): Promise<ProductRankingDetails> {
  const response = await fetch(`/api/products/${productId}/ranking`)
  
  if (!response.ok) {
    throw new Error('Failed to load ranking details')
  }
  
  return response.json()
}

// --- Utility Functions ---

/**
 * Format ranking score for display
 */
export function formatRankingScore(score: number): string {
  return score.toFixed(2)
}

/**
 * Get ranking badge text based on percentile
 */
export function getRankingBadge(percentile: number): string {
  if (percentile >= 90) return 'Top 10%'
  if (percentile >= 75) return 'Top 25%'
  if (percentile >= 50) return 'Top 50%'
  return 'Below Average'
}

/**
 * Get ranking color based on score
 */
export function getRankingColor(
  percentile: number
): 'success' | 'info' | 'warning' | 'danger' {
  if (percentile >= 90) return 'success'
  if (percentile >= 75) return 'info'
  if (percentile >= 50) return 'warning'
  return 'danger'
}

/**
 * Calculate conversion rate percentage
 */
export function formatConversionRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

/**
 * Get signal breakdown text
 */
export function getSignalBreakdown(signals: ProductRankingDetails['signals']): string[] {
  const breakdown: string[] = []

  if (signals.purchases.count && signals.purchases.count > 0) {
    breakdown.push(`${signals.purchases.count} purchases`)
  }

  if (signals.views.count && signals.views.count > 0) {
    breakdown.push(`${signals.views.count} views`)
  }

  if (signals.conversionRate.rate) {
    breakdown.push(`${formatConversionRate(signals.conversionRate.rate)} conversion`)
  }

  if (signals.rating.score && signals.rating.score > 0) {
    breakdown.push(`Rating score: ${signals.rating.score.toFixed(1)}`)
  }

  return breakdown
}

/**
 * Build query string for pagination
 */
export function buildPaginationParams(
  page: number,
  pageSize: number
): { limit: number; offset: number } {
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
}

/**
 * Handle sort change in UI
 */
export function handleSortChange(
  newSort: SortOption,
  currentSort: SortOption
): boolean {
  return newSort !== currentSort
}

// --- Types for hooks ---

export interface UseRankingOptions {
  categoryId?: string
  query?: string
  sortBy?: SortOption
  minPrice?: number
  maxPrice?: number
  pageSize?: number
}

export interface RankingState {
  products: RankedProduct[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  error: string | null
  sortBy: SortOption
}
