import { supabaseServer } from '@/lib/supabase/server'
import { Candidate, FilterState, NormalizedIntent } from './types'
import { runLexicalSearch } from './lexical'
import { runSemanticSearch } from './semantic'
import { applyWeakBoosts, mergeCandidates, scoreCandidate } from './ranking'

async function fetchNewestActive(limit = 20): Promise<Candidate[]> {
  const { data } = await supabaseServer
    .from('products')
    .select('id, base_price, category, created_at, search_metadata')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).map((row: any) => ({
    product_id: row.id,
    semantic_score: 0,
    lexical_score: 0,
    boosts: 0,
    total_score: 0,
    base_price: row.base_price ?? undefined,
    category: row.category ?? null,
    in_stock: row.search_metadata?.has_stock ?? null,
    created_at: row.created_at,
  }))
}

export async function applyFallbacks(
  intent: NormalizedIntent,
  filterState: FilterState
): Promise<{ candidates: Candidate[]; fallbacks: string[] }> {
  const fallbacks: string[] = []

  if (filterState.in_stock === true) {
    const relaxed = { ...filterState, in_stock: null }
    const semantic = await runSemanticSearch(intent, relaxed)
    const lexical = await runLexicalSearch(intent, relaxed)
    let candidates = mergeCandidates(semantic, lexical)
    candidates = applyWeakBoosts(candidates, intent)
    if (candidates.length > 0) {
      fallbacks.push('relax_in_stock')
      return { candidates, fallbacks }
    }
  }

  if (filterState.category) {
    const relaxed = { ...filterState, category: null }
    const semantic = await runSemanticSearch(intent, relaxed)
    const lexical = await runLexicalSearch(intent, relaxed)
    let candidates = mergeCandidates(semantic, lexical)
    candidates = applyWeakBoosts(candidates, intent)
    if (candidates.length > 0) {
      fallbacks.push('relax_category')
      return { candidates, fallbacks }
    }
  }

  const newest = await fetchNewestActive(20)
  const candidates = newest.map((c) => ({
    ...c,
    total_score: scoreCandidate(c)
  }))
  fallbacks.push('fallback_newest')
  return { candidates, fallbacks }
}
