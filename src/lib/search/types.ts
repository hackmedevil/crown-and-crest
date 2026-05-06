export type Confidence = 'strong' | 'weak' | 'optional'

export type NormalizedIntent = {
  intent: {
    query_text: string
    category?: string | null
    price_range?: { min?: number | null; max?: number | null }
    sort_preference?: 'price_asc' | 'price_desc' | 'newest' | 'best_selling' | 'relevance'
    color?: string | null
    gender?: 'men' | 'women' | 'unisex' | 'kids' | null
    fit?: 'slim' | 'regular' | 'relaxed' | 'oversized' | null
    tags?: string[]
    attributes?: { season?: string | null; usage?: string | null; style?: string[] }
    in_stock?: boolean | null
  }
  confidence: {
    category?: Confidence
    price_range?: Confidence
    sort_preference?: Confidence
    color?: Confidence
    gender?: Confidence
    fit?: Confidence
    attributes?: Confidence
    in_stock?: Confidence
  }
  ignored_terms?: string[]
}

export type FilterState = {
  category?: string | null
  price_range?: { min?: number | null; max?: number | null } | null
  in_stock?: boolean | null
}

export type Candidate = {
  product_id: string
  semantic_score?: number
  lexical_score?: number
  boosts?: number
  total_score?: number
  created_at?: string
  base_price?: number
  category?: string | null
  in_stock?: boolean | null
  color?: string | null
  fit?: string | null
  gender?: string | null
  tags?: string[]
  style?: string[]
}

export type SearchResult = {
  query_id: string
  results: Array<{ product_id: string; score: number }>
  applied_filters: Record<string, unknown>
  fallbacks_used: string[]
}
