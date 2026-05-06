export type ShopSort = 'ranking' | 'price_low_high' | 'price_high_low' | 'newest' | 'rating'

export interface ShopProduct {
  id: string
  name: string
  slug: string
  category_id: string | null
  brand: string | null
  base_price: number
  image_url: string | null
  created_at: string
  ranking_score: number
  purchase_count: number
  unique_user_views: number
  rating: number
  review_count: number
}

export interface FacetCount {
  value: string
  count: number
}

export interface ShopFiltersPayload {
  brands: FacetCount[]
  sizes: FacetCount[]
  colors: FacetCount[]
  price_range: {
    min_price: number
    max_price: number
  }
}

export interface ShopPagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface ShopApiResponse {
  products: ShopProduct[]
  filters: ShopFiltersPayload
  pagination: ShopPagination
}

export interface ShopQueryState {
  category?: string
  search?: string
  brand: string[]
  size: string[]
  color: string[]
  min_price?: number
  max_price?: number
  rating?: number
  sort: ShopSort
  page: number
  limit: number
}
