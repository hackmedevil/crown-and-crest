import { supabaseServer } from '@/lib/supabase/server'
import { Candidate, FilterState, NormalizedIntent } from './types'

const COLOR_TERMS = new Set([
  'black','white','navy','blue','red','green','yellow','pink','grey','gray','brown','beige','cream','maroon','olive','purple','orange','teal'
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function getTextField(value: unknown): string {
  if (!value) return ''
  if (Array.isArray(value)) return value.join(' ')
  if (typeof value === 'string') return value
  return ''
}

function deriveColor(row: any): string | null {
  const metaColor = row.search_metadata?.color
  if (typeof metaColor === 'string' && COLOR_TERMS.has(metaColor.toLowerCase())) return metaColor.toLowerCase()

  const candidates = [
    row.name,
    row.description,
    row.ai_title,
    row.ai_description,
    getTextField(row.ai_tags),
    getTextField(row.style)
  ].join(' ')

  for (const token of tokenize(candidates)) {
    if (COLOR_TERMS.has(token)) return token
  }

  return null
}

function computeLexicalScore(queryTokens: string[], haystack: string): number {
  if (queryTokens.length === 0) return 0
  const text = haystack.toLowerCase()
  let matchCount = 0
  for (const token of queryTokens) {
    if (text.includes(token)) matchCount += 1
  }
  return matchCount / queryTokens.length
}

export async function runLexicalSearch(intent: NormalizedIntent, filterState: FilterState): Promise<Candidate[]> {
  const queryTokens = tokenize(intent.intent.query_text)
  if (queryTokens.length === 0) return []

  const tokensForOr = queryTokens.slice(0, 6)
  const orConditions = tokensForOr.flatMap((token) => [
    `name.ilike.%${token}%`,
    `description.ilike.%${token}%`,
    `ai_title.ilike.%${token}%`,
    `ai_description.ilike.%${token}%`,
    `category.ilike.%${token}%`
  ])

  let query = supabaseServer
    .from('products')
    .select('id, name, description, ai_title, ai_description, category, base_price, ai_tags, style, fit, gender, search_metadata, created_at')
    .or(orConditions.join(','))

  if (filterState.category) query = query.eq('category', filterState.category)
  if (filterState.price_range?.min != null) query = query.gte('base_price', filterState.price_range.min)
  if (filterState.price_range?.max != null) query = query.lte('base_price', filterState.price_range.max)
  if (filterState.in_stock === true) query = query.filter('search_metadata->has_stock', 'eq', true)

  const { data } = await query.limit(120)

  return (data || []).map((row: any) => {
    const textBlob = [
      row.name,
      row.description,
      row.ai_title,
      row.ai_description,
      row.category,
      getTextField(row.ai_tags),
      getTextField(row.style)
    ].join(' ')

    const lexicalScore = computeLexicalScore(queryTokens, textBlob)

    return {
      product_id: row.id,
      lexical_score: lexicalScore,
      base_price: row.base_price ?? undefined,
      category: row.category ?? null,
      in_stock: row.search_metadata?.has_stock ?? null,
      created_at: row.created_at,
      color: deriveColor(row),
      fit: row.fit ?? null,
      gender: row.gender ?? null,
      tags: Array.isArray(row.ai_tags) ? row.ai_tags : [],
      style: Array.isArray(row.style) ? row.style : [],
    }
  })
}
