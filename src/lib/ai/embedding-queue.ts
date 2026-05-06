'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export interface EmbeddingJob {
  id: string
  entity_type: 'product' | 'search_query'
  entity_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  last_error: string | null
  created_at: string
  updated_at: string
}

/**
 * Enqueue product embedding job (fire-and-forget, never throws)
 */
export async function enqueueProductEmbedding(productId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('embedding_jobs')
      .insert({
        entity_type: 'product',
        entity_id: productId,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      // Ignore duplicate key errors (job already exists)
      if (error.code === '23505') {
        console.log('[Embedding Queue] Job already exists for product:', productId)
        return true
      }
      console.error('[Embedding Queue] Failed to enqueue product job:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Embedding Queue] Exception enqueueing product:', error)
    return false
  }
}

/**
 * Enqueue search query embedding job (fire-and-forget, never throws)
 */
export async function enqueueSearchQueryEmbedding(query: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('embedding_jobs')
      .insert({
        entity_type: 'search_query',
        entity_id: query,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        console.log('[Embedding Queue] Job already exists for query:', query)
        return true
      }
      console.error('[Embedding Queue] Failed to enqueue search query job:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Embedding Queue] Exception enqueueing query:', error)
    return false
  }
}

/**
 * Get next pending job (oldest first, respects priority)
 */
export async function getNextPendingJob(): Promise<EmbeddingJob | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('embedding_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('attempts', 3) // Max 3 retry attempts
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // No rows
      console.error('[Embedding Queue] Failed to fetch next job:', error)
      return null
    }

    return data as EmbeddingJob
  } catch (error) {
    console.error('[Embedding Queue] Exception fetching job:', error)
    return null
  }
}

/**
 * Mark job as processing (atomic update)
 */
export async function markJobProcessing(jobId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('embedding_jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      console.error('[Embedding Queue] Failed to mark job processing:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Embedding Queue] Exception marking job processing:', error)
    return false
  }
}

/**
 * Mark job as completed
 */
export async function markJobCompleted(jobId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('embedding_jobs')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      console.error('[Embedding Queue] Failed to mark job completed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Embedding Queue] Exception marking job completed:', error)
    return false
  }
}

/**
 * Mark job as failed and increment attempts
 */
export async function markJobFailed(jobId: string, errorMessage: string): Promise<boolean> {
  try {
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('embedding_jobs')
      .select('attempts')
      .eq('id', jobId)
      .single()

    if (fetchError) {
      console.error('[Embedding Queue] Failed to fetch job attempts:', fetchError)
      return false
    }

    const nextAttempts = (job?.attempts ?? 0) + 1

    const { error } = await supabaseAdmin
      .from('embedding_jobs')
      .update({
        status: 'failed',
        last_error: errorMessage,
        attempts: nextAttempts
      })
      .eq('id', jobId)

    if (error) {
      console.error('[Embedding Queue] Failed to mark job failed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Embedding Queue] Exception marking job failed:', error)
    return false
  }
}
