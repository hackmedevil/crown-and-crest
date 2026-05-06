import { supabaseServer } from '@/lib/supabase/server'
import { Candidate, FilterState, NormalizedIntent } from './types'

type QueryEmbeddingRow = {
  embedding: number[] | null
}

async function getQueryEmbedding(queryText: string): Promise<number[] | null> {
  const { data } = await supabaseServer
    .from('search_query_embeddings')
    .select('embedding')
    .eq('query', queryText)
    .eq('status', 'completed')
    .single<QueryEmbeddingRow>()

  if (!data?.embedding) return null
  return data.embedding
}

function applyStrongFilters(candidates: Candidate[], filterState: FilterState): Candidate[] {
  return candidates.filter((c) => {
    if (filterState.category && c.category !== filterState.category) return false
    if (filterState.in_stock === true && c.in_stock !== true) return false
    if (filterState.price_range?.min != null && (c.base_price ?? 0) < filterState.price_range.min) return false
    if (filterState.price_range?.max != null && (c.base_price ?? 0) > filterState.price_range.max) return false
    return true
  })
}

export async function runSemanticSearch(intent: NormalizedIntent, filterState: FilterState): Promise<Candidate[]> {
  const embedding = await getQueryEmbedding(intent.intent.query_text)
  if (!embedding) return []

  const { data } = await supabaseServer.rpc('search_products_by_embedding', {
    query_embedding: JSON.stringify(embedding),
    match_threshold: 0.5,
    match_count: 80,
  })

  const rows = (data || []) as Array<{ id: string; category: string | null; base_price: number | null; similarity: number; in_stock: boolean | null; created_at?: string }>
  const ids = rows.map((r) => r.id)

  let attrMap = new Map<string, { id: string; ai_tags: string[] | null; style: string[] | null; fit: string | null; gender: string | null; search_metadata: { color?: string | null } | null }>()
  if (ids.length > 0) {
    const { data: attrRows } = await supabaseServer
      .from('products')
      .select('id, ai_tags, style, fit, gender, search_metadata')
      .in('id', ids)

    attrMap = new Map((attrRows || []).map((r: any) => [r.id, r]))
  }

  const candidates: Candidate[] = rows.map((row) => {
    const attrs = attrMap.get(row.id)
    return {
      product_id: row.id,
      semantic_score: row.similarity,
      base_price: row.base_price ?? undefined,
      category: row.category ?? null,
      in_stock: row.in_stock ?? null,
      created_at: row.created_at,
      color: attrs?.search_metadata?.color ?? null,
      fit: attrs?.fit ?? null,
      gender: attrs?.gender ?? null,
      tags: Array.isArray(attrs?.ai_tags) ? attrs?.ai_tags : [],
      style: Array.isArray(attrs?.style) ? attrs?.style : [],
    }
  })

  return applyStrongFilters(candidates, filterState)
}
