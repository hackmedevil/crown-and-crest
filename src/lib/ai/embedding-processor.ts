'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateEmbedding, generateProductEmbedding } from '@/lib/ai/embeddings'
import {
  getNextPendingJob,
  markJobProcessing,
  markJobCompleted,
  markJobFailed,
  type EmbeddingJob
} from '@/lib/ai/embedding-queue'

export interface ProcessingResult {
  processed: number
  failed: number
  remaining: number
  errors: Array<{ jobId: string; error: string }>
}

/**
 * Process a single embedding job
 * Returns true if successful, false otherwise
 * NEVER throws errors - all failures are logged and returned
 */
export async function processNextEmbeddingJob(): Promise<boolean> {
  try {
    // 1. Get next job
    const job = await getNextPendingJob()
    if (!job) {
      return false // No jobs to process
    }

    console.log(`[Embedding Processor] Processing ${job.entity_type} job:`, job.entity_id)

    // 2. Mark as processing
    await markJobProcessing(job.id)

    // 3. Generate embedding based on entity type
    try {
      if (job.entity_type === 'product') {
        await processProductEmbedding(job)
      } else if (job.entity_type === 'search_query') {
        await processSearchQueryEmbedding(job)
      } else {
        throw new Error(`Unknown entity type: ${job.entity_type}`)
      }

      // 4. Mark as completed
      await markJobCompleted(job.id)
      console.log(`[Embedding Processor] Completed ${job.entity_type}:`, job.entity_id)
      return true

    } catch (processingError) {
      // 5. Mark as failed with error message
      const errorMessage = processingError instanceof Error 
        ? processingError.message 
        : 'Unknown processing error'
      
      await markJobFailed(job.id, errorMessage)
      console.error(`[Embedding Processor] Failed ${job.entity_type}:`, job.entity_id, errorMessage)
      return false
    }

  } catch (error) {
    console.error('[Embedding Processor] Critical error:', error)
    return false
  }
}

/**
 * Process product embedding job
 */
async function processProductEmbedding(job: EmbeddingJob): Promise<void> {
  // 1. Fetch product data
  const { data: product, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('id', job.entity_id)
    .single()

  if (fetchError || !product) {
    throw new Error(`Product not found: ${job.entity_id}`)
  }

  // 2. Generate embedding
  const embedding = await generateProductEmbedding({
    name: product.name,
    title: product.name,
    ai_title: product.ai_title,
    ai_description: product.ai_description,
    ai_tags: product.ai_tags,
    description: product.description,
    category: product.category,
    tags: product.tags,
    season: product.season,
    fabric: product.fabric,
    usage: product.usage,
    style_keywords: product.style_keywords,
    style: product.style,
    weather: product.weather
  })

  // 3. Update product with embedding
  const { error: updateError } = await supabaseAdmin
    .from('products')
    .update({
      embedding: JSON.stringify(embedding), // pgvector requires JSON string
      embedding_status: 'completed'
    })
    .eq('id', job.entity_id)

  if (updateError) {
    throw new Error(`Failed to update product embedding: ${updateError.message}`)
  }
}

/**
 * Process search query embedding job
 */
async function processSearchQueryEmbedding(job: EmbeddingJob): Promise<void> {
  const query = job.entity_id

  // 1. Generate embedding
  const result = await generateEmbedding(query)

  // 2. Upsert into search_query_embeddings
  const { error: upsertError } = await supabaseAdmin
    .from('search_query_embeddings')
    .upsert({
      query,
      embedding: JSON.stringify(result.embedding),
      status: 'completed',
      attempts: 0,
      last_error: null
    }, {
      onConflict: 'query'
    })

  if (upsertError) {
    throw new Error(`Failed to update query embedding: ${upsertError.message}`)
  }
}

/**
 * Process multiple embedding jobs in batch
 * Returns summary of processing results
 */
export async function processBatchEmbeddingJobs(limit: number = 10): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    failed: 0,
    remaining: 0,
    errors: []
  }

  for (let i = 0; i < limit; i++) {
    const success = await processNextEmbeddingJob()
    
    if (!success) {
      // Check if there are remaining jobs
      const nextJob = await getNextPendingJob()
      if (!nextJob) {
        break // No more jobs
      }
      result.failed++
    } else {
      result.processed++
    }

    // Rate limiting: 100ms between jobs
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // Count remaining jobs
  try {
    const { count } = await supabaseAdmin
      .from('embedding_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'failed'])
      .lt('attempts', 3)

    result.remaining = count || 0
  } catch (error) {
    console.error('[Embedding Processor] Failed to count remaining jobs:', error)
  }

  return result
}
