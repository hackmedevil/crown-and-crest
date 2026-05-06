'use server'

import { supabaseServer } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/ai/embeddings'
import { enqueueSearchQueryEmbedding } from '@/lib/ai/embedding-queue'

export interface SearchResult {
  id: string
  title: string
  description: string | null
  category: string | null
  base_price: number
  image_url: string | null
  slug: string
  similarity?: number
  in_stock: boolean
  created_at: string
  search_method: 'vector' | 'lexical' // Track which method was used
}

/**
 * AI-powered product search with automatic fallback
 * Gracefully handles missing embeddings
 */
export async function searchProducts(
  query: string,
  options?: {
    matchThreshold?: number
    matchCount?: number
  }
): Promise<SearchResult[]> {
  const matchThreshold = options?.matchThreshold ?? 0.5
  const matchCount = options?.matchCount ?? 20

  try {
    // Try vector search first
    const vectorResults = await searchProductsByVector(query, matchThreshold, matchCount)
    
    if (vectorResults.length > 0) {
      return vectorResults
    }

    // Fallback to lexical search if no vector results
    console.log('[AI Search] No vector results, falling back to lexical search for:', query)
    return await searchProductsLexical(query, matchCount)
    
  } catch (error) {
    console.error('[AI Search] Error in search pipeline:', error)
    // Final fallback: lexical search
    return await searchProductsLexical(query, matchCount)
  }
}

/**
 * Vector-based semantic search
 * Returns empty array if embeddings are missing (graceful degradation)
 */
async function searchProductsByVector(
  query: string,
  matchThreshold: number,
  matchCount: number
): Promise<SearchResult[]> {
  try {
    // 1. Check if query embedding exists in cache
    let queryEmbedding: number[] | null = null
    
    const { data: cachedQuery } = await supabaseServer
      .from('search_query_embeddings')
      .select('embedding, status')
      .eq('query', query)
      .eq('status', 'completed')
      .single()

    if (cachedQuery?.embedding) {
      queryEmbedding = cachedQuery.embedding
    } else {
      // 2. Generate embedding synchronously (one-time cost per unique query)
      try {
        const result = await generateEmbedding(query)
        queryEmbedding = result.embedding

        // 3. Cache the embedding (fire-and-forget)
        void supabaseServer
          .from('search_query_embeddings')
          .upsert({
            query,
            embedding: JSON.stringify(queryEmbedding), // pgvector requires stringified array
            status: 'completed'
          }, {
            onConflict: 'query',
            ignoreDuplicates: false
          })
          .then(
            (res) => {
              if (res.error) {
                console.warn('[AI Search] Failed to cache query embedding:', res.error)
              }
            },
            (err) => console.warn('[AI Search] Embedding cache error:', err)
          )
      } catch (genError) {
        console.warn('[AI Search] Failed to generate query embedding:', genError)
        // Enqueue for background processing (fire-and-forget)
        enqueueSearchQueryEmbedding(query).catch(() => {})
        return [] // Return empty, will fallback to lexical
      }
    }

    // 4. Perform vector search using RPC
    const { data, error } = await supabaseServer.rpc('search_products_by_embedding', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: matchThreshold,
      match_count: matchCount
    })

    if (error) {
      console.error('[AI Search] Vector search RPC failed:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      ...row,
      search_method: 'vector' as const
    }))

  } catch (error) {
    console.error('[AI Search] Vector search error:', error)
    return []
  }
}

/**
 * Lexical fallback using search_metadata JSONB
 * Always works, even if embeddings are missing
 */
async function searchProductsLexical(
  query: string,
  matchCount: number
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabaseServer
      .from('products')
      .select(`
        id,
        name,
        description,
        category,
        base_price,
        image_url,
        slug,
        created_at,
        search_metadata,
        ai_title
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(matchCount)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AI Search] Lexical search failed:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.ai_title || row.name,
      description: row.description,
      category: row.category,
      base_price: row.base_price,
      image_url: row.image_url,
      slug: row.slug,
      created_at: row.created_at,
      in_stock: row.search_metadata?.has_stock ?? false,
      search_method: 'lexical' as const
    }))

  } catch (error) {
    console.error('[AI Search] Lexical search error:', error)
    return []
  }
}
