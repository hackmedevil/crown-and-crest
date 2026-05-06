import { applyFallbacks } from './fallback'
import { runLexicalSearch } from './lexical'
import { mergeCandidates, applyWeakBoosts } from './ranking'
import { runSemanticSearch } from './semantic'
import { FilterState, NormalizedIntent, SearchResult } from './types'

function buildFilterState(intent: NormalizedIntent): FilterState {
  return {
    category: intent.confidence.category === 'strong' ? intent.intent.category ?? null : null,
    price_range: intent.confidence.price_range === 'strong' ? intent.intent.price_range ?? null : null,
    in_stock: intent.confidence.in_stock === 'strong' ? intent.intent.in_stock ?? null : null,
  }
}

export async function executeSearch(intent: NormalizedIntent): Promise<SearchResult> {
  const query_id = crypto.randomUUID()
  const fallbacks_used: string[] = []
  const applied_filters: Record<string, unknown> = {}

  const filterState = buildFilterState(intent)
  applied_filters.category = filterState.category ?? null
  applied_filters.price_range = filterState.price_range ?? null
  applied_filters.in_stock = filterState.in_stock ?? null

  const semantic = await runSemanticSearch(intent, filterState)
  const lexical = await runLexicalSearch(intent, filterState)

  let candidates = mergeCandidates(semantic, lexical)
  candidates = applyWeakBoosts(candidates, intent)

  if (candidates.length === 0) {
    const fallbackState = await applyFallbacks(intent, filterState)
    candidates = fallbackState.candidates
    fallbacks_used.push(...fallbackState.fallbacks)
  }

  candidates.sort((a, b) => {
    const scoreDelta = (b.total_score ?? 0) - (a.total_score ?? 0)
    if (scoreDelta !== 0) return scoreDelta
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })

  return {
    query_id,
    results: candidates.map((c) => ({ product_id: c.product_id, score: c.total_score ?? 0 })),
    applied_filters,
    fallbacks_used,
  }
}
