import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { generateEmbedding, generateProductEmbedding } from '@/lib/ai/embeddings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for processing

/**
 * Background job processor for embedding generation
 * Should be called by Vercel Cron every 5 minutes
 * Route: /api/cron/process-embeddings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = supabaseServer
    
    // Fetch pending jobs (limit to 10 per run to avoid timeouts)
    const { data: jobs, error: fetchError } = await supabase
      .from('embedding_jobs')
      .select('id, product_id, attempts, max_attempts')
      .eq('status', 'pending')
      .lt('attempts', 3) // Max 3 attempts
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Failed to fetch jobs:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ 
        message: 'No pending jobs',
        processed: 0 
      })
    }

    let successCount = 0
    let failCount = 0

    // Process each job
    for (const job of jobs) {
      try {
        // Mark as processing
        await supabase
          .from('embedding_jobs')
          .update({ 
            status: 'processing',
            started_at: new Date().toISOString(),
            attempts: job.attempts + 1
          })
          .eq('id', job.id)

        // Fetch product data
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, name, description, category, tags, ai_title, ai_description, ai_tags, season, fabric, usage, style, weather, style_keywords')
          .eq('id', job.product_id)
          .single()

        if (productError || !product) {
          throw new Error(`Product not found: ${job.product_id}`)
        }

        // Generate embedding
        const embedding = await generateProductEmbedding({
          name: product.name,
          description: product.description,
          category: product.category,
          tags: product.tags,
          ai_title: product.ai_title,
          ai_description: product.ai_description,
          ai_tags: product.ai_tags,
          season: product.season,
          fabric: product.fabric,
          usage: product.usage,
          style: product.style,
          weather: product.weather,
          style_keywords: product.style_keywords,
        })

        // Update product with embedding
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            embedding: JSON.stringify(embedding),
            embedding_status: 'completed',
            embedding_generated_at: new Date().toISOString(),
            embedding_error: null
          })
          .eq('id', job.product_id)

        if (updateError) {
          throw updateError
        }

        // Mark job as completed
        await supabase
          .from('embedding_jobs')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id)

        successCount++
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to process job ${job.id}:`, errorMessage)
        
        // Mark job as failed (or pending if retries remain)
        const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending'
        
        await supabase
          .from('embedding_jobs')
          .update({ 
            status: newStatus,
            error: errorMessage
          })
          .eq('id', job.id)

        // Update product status
        if (newStatus === 'failed') {
          await supabase
            .from('products')
            .update({ 
              embedding_status: 'failed',
              embedding_error: errorMessage
            })
            .eq('id', job.product_id)
        }

        failCount++
      }
    }

    // Process queued search query embeddings (limit 20)
    const { data: queryJobs, error: queryError } = await supabase
      .from('search_query_embeddings')
      .select('query, attempts, status')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('updated_at', { ascending: true })
      .limit(20)

    if (queryError) {
      console.error('Failed to fetch search query jobs:', queryError)
    } else if (queryJobs && queryJobs.length > 0) {
      for (const job of queryJobs) {
        try {
          await supabase
            .from('search_query_embeddings')
            .update({ status: 'processing', attempts: job.attempts + 1, updated_at: new Date().toISOString() })
            .eq('query', job.query)

          const { embedding } = await generateEmbedding(job.query)

          await supabase
            .from('search_query_embeddings')
            .update({
              embedding: JSON.stringify(embedding),
              status: 'completed',
              last_error: null,
              updated_at: new Date().toISOString()
            })
            .eq('query', job.query)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          await supabase
            .from('search_query_embeddings')
            .update({
              status: 'failed',
              last_error: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('query', job.query)
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: jobs.length,
      successful: successCount,
      failed: failCount,
      message: `Processed ${successCount}/${jobs.length} embeddings successfully`
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        error: 'Job processing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
