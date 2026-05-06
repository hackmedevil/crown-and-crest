import { Candidate, NormalizedIntent } from './types'

function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

function matchesColor(candidate: Candidate, intentColor?: string | null): boolean {
  if (!intentColor) return false
  if (!candidate.color) return false
  return normalizeToken(candidate.color) === normalizeToken(intentColor)
}

function matchesFit(candidate: Candidate, intentFit?: string | null): boolean {
  if (!intentFit) return false
  if (!candidate.fit) return false
  return normalizeToken(candidate.fit) === normalizeToken(intentFit)
}

function matchesGender(candidate: Candidate, intentGender?: string | null): boolean {
  if (!intentGender) return false
  if (!candidate.gender) return false
  return normalizeToken(candidate.gender) === normalizeToken(intentGender)
}

function matchesStyleOrTags(candidate: Candidate, intent: NormalizedIntent): boolean {
  const intentStyles = intent.intent.attributes?.style || []
  const intentTags = intent.intent.tags || []
  const needle = new Set([...intentStyles, ...intentTags].map(normalizeToken))
  if (needle.size === 0) return false

  const haystack = new Set([...(candidate.style || []), ...(candidate.tags || [])].map(normalizeToken))
  for (const token of needle) {
    if (haystack.has(token)) return true
  }
  return false
}

export function scoreCandidate(candidate: Candidate): number {
  const semantic = candidate.semantic_score ?? 0
  const lexical = candidate.lexical_score ?? 0
  const boosts = candidate.boosts ?? 0
  return (semantic * 0.60) + (lexical * 0.30) + boosts
}

export function mergeCandidates(semantic: Candidate[], lexical: Candidate[]): Candidate[] {
  const map = new Map<string, Candidate>()

  for (const c of semantic) {
    map.set(c.product_id, { ...c })
  }

  for (const c of lexical) {
    const existing = map.get(c.product_id)
    if (!existing) {
      map.set(c.product_id, { ...c })
    } else {
      map.set(c.product_id, {
        ...existing,
        lexical_score: c.lexical_score ?? existing.lexical_score,
        color: existing.color ?? c.color,
        fit: existing.fit ?? c.fit,
        gender: existing.gender ?? c.gender,
        tags: existing.tags ?? c.tags,
        style: existing.style ?? c.style,
        created_at: existing.created_at ?? c.created_at,
        base_price: existing.base_price ?? c.base_price,
        category: existing.category ?? c.category,
        in_stock: existing.in_stock ?? c.in_stock,
      })
    }
  }

  return Array.from(map.values()).map((c) => ({
    ...c,
    boosts: 0,
    total_score: scoreCandidate(c),
  }))
}

export function applyWeakBoosts(candidates: Candidate[], intent: NormalizedIntent): Candidate[] {
  return candidates.map((candidate) => {
    let boosts = 0

    if (matchesColor(candidate, intent.intent.color)) boosts += 0.05
    if (matchesFit(candidate, intent.intent.fit)) boosts += 0.05
    if (matchesGender(candidate, intent.intent.gender)) boosts += 0.03
    if (matchesStyleOrTags(candidate, intent)) boosts += 0.03
    if (intent.intent.in_stock === true && candidate.in_stock === true) boosts += 0.05

    const updated = { ...candidate, boosts }
    return { ...updated, total_score: scoreCandidate(updated) }
  })
}
