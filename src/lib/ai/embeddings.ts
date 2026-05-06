/**
 * AI Embeddings System
 * Handles generating and managing vector embeddings for semantic search
 */

import { supabaseServer } from '@/lib/supabase/server'
import { decrypt } from '@/lib/utils/encryption'

export interface EmbeddingResult {
  embedding: number[]
  model: string
  dimensions: number
}

const EXPECTED_EMBEDDING_DIMENSIONS = 1536

/**
 * Get active AI provider configuration from database
 */
async function getActiveProvider(): Promise<{ provider: string; apiKey: string; baseUrl: string | null } | null> {
  try {
    const { data, error } = await supabaseServer
      .from('ai_api_keys')
      .select(`
        encrypted_key,
        ai_providers!inner (
          name,
          base_url
        )
      `)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      console.error('[Embeddings] No active provider found:', error)
      return null
    }

    // Decrypt API key
    const apiKey = decrypt(data.encrypted_key)
    const provider = (data.ai_providers as any).name
    const baseUrl = (data.ai_providers as any).base_url

    return { provider, apiKey, baseUrl }
  } catch (error) {
    console.error('[Embeddings] Failed to get provider:', error)
    return null
  }
}

/**
 * Generate embedding from text using AI provider
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Try to get provider from database first
    const dbProvider = await getActiveProvider()

    if (dbProvider) {
      // Use database-configured provider
      const result = await generateWithProvider(dbProvider.provider, dbProvider.apiKey, dbProvider.baseUrl, text)
      return ensureExpectedDimensions(result)
    }

    // Fallback to environment variables (backward compatibility)
    const openaiKey = process.env.OPENAI_API_KEY
    if (openaiKey) {
      const result = await generateWithProvider('openai', openaiKey, null, text)
      return ensureExpectedDimensions(result)
    }

    const googleKey = process.env.GOOGLE_API_KEY
    if (googleKey) {
      const result = await generateWithProvider('google', googleKey, null, text)
      return ensureExpectedDimensions(result)
    }

    throw new Error('No AI provider configured. Configure a provider in admin settings.')
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

function ensureExpectedDimensions(result: EmbeddingResult): EmbeddingResult {
  if (result.dimensions !== EXPECTED_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EXPECTED_EMBEDDING_DIMENSIONS}, got ${result.dimensions}. Use a 1536-dim embedding model or update the DB vector size.`
    )
  }

  return result
}

/**
 * Generate embedding with specific provider
 */
async function generateWithProvider(
  provider: string,
  apiKey: string,
  baseUrl: string | null,
  text: string
): Promise<EmbeddingResult> {
  switch (provider) {
    case 'openai':
      return await generateOpenAIEmbedding(apiKey, text)
    case 'google':
      return await generateGoogleEmbedding(apiKey, text)
    default:
      throw new Error(`Embedding generation not supported for provider: ${provider}`)
  }
}

/**
 * Generate embedding using OpenAI
 */
async function generateOpenAIEmbedding(apiKey: string, text: string): Promise<EmbeddingResult> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small', // 1536 dimensions, cost-effective
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI embedding failed: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    embedding: data.data[0].embedding,
    model: 'text-embedding-3-small',
    dimensions: 1536,
  }
}

/**
 * Generate embedding using Google Gemini
 */
async function generateGoogleEmbedding(apiKey: string, text: string): Promise<EmbeddingResult> {
  const model = 'models/text-embedding-004'
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }]
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini embedding failed: ${response.statusText}`)
  }

  const data = await response.json()
  return {
    embedding: data.embedding.values,
    model: 'text-embedding-004',
    dimensions: data.embedding.values.length,
  }
}


/**
 * Generate product embedding from product data with enhanced fields
 */
export async function generateProductEmbedding(product: {
  name?: string
  title?: string
  ai_title?: string | null
  ai_description?: string | null
  ai_tags?: string[] | null
  description?: string | null
  category?: string | null
  tags?: string[] | null
  season?: string | null
  fabric?: string[] | null
  usage?: string | null
  style_keywords?: string[] | null
  style?: string[] | string | null
  weather?: string | null
}): Promise<number[]> {
  const resolvedTitle = product.ai_title || product.name || product.title || ''
  const resolvedDescription = product.ai_description || product.description || ''
  const resolvedTags = product.ai_tags || product.tags || []
  const resolvedStyleKeywords = Array.isArray(product.style)
    ? product.style
    : (product.style ? [product.style] : [])

  const combinedStyle = [
    ...resolvedStyleKeywords,
    ...(product.style_keywords || [])
  ]

  // Build rich semantic text from ALL product fields
  const parts: string[] = [
    resolvedTitle,
    resolvedDescription,
    product.category || '',
  ]

  // Add tags
  if (resolvedTags.length > 0) {
    parts.push(resolvedTags.join(' '))
  }

  // Add season context (critical for semantic understanding)
  if (product.season) {
    parts.push(`Season: ${product.season}`)
  }

  // Add fabric information
  if (product.fabric && product.fabric.length > 0) {
    parts.push(`Fabric: ${product.fabric.join(', ')}`)
  }

  // Add usage context
  if (product.usage) {
    parts.push(`Usage: ${product.usage}`)
  }

  // Add style keywords for enhanced semantic matching
  if (combinedStyle.length > 0) {
    parts.push(`Style: ${combinedStyle.join(', ')}`)
  }

  if (product.weather) {
    parts.push(`Weather: ${product.weather}`)
  }

  const searchText = parts.filter(Boolean).join('. ')
  
  const result = await generateEmbedding(searchText)
  return result.embedding
}

/**
 * Batch generate embeddings for multiple products
 */
export async function batchGenerateProductEmbeddings(
  products: Array<{
    id: string
    title: string
    description?: string
    category?: string
    tags?: string[]
    season?: string | null
    fabric?: string[] | null
    usage?: string | null
    style_keywords?: string[] | null
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>()
  
  for (let i = 0; i < products.length; i++) {
    try {
      const embedding = await generateProductEmbedding(products[i])
      embeddings.set(products[i].id, embedding)
      
      if (onProgress) {
        onProgress(i + 1, products.length)
      }
      
      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Failed to generate embedding for product ${products[i].id}:`, error)
      // Continue with next product
    }
  }
  
  return embeddings
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions')
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}
