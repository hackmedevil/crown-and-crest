import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { processBatchEmbeddingJobs } from '@/lib/ai/embedding-processor'

/**
 * Process pending embedding jobs
 * POST /api/admin/embeddings/process
 * 
 * Can be called:
 * - Manually from admin UI
 * - Via cron job
 * - Via webhook after product save
 */
export async function POST() {
  try {
    // Verify admin authorization
    await requireAdmin()

    // Process up to 50 jobs per request
    const result = await processBatchEmbeddingJobs(50)

    return NextResponse.json({
      success: true,
      ...result,
      message: `Processed ${result.processed} jobs, ${result.failed} failed, ${result.remaining} remaining`
    })

  } catch (error) {
    console.error('[Embedding API] Error processing jobs:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed: 0,
        failed: 0,
        remaining: 0
      },
      { status: 500 }
    )
  }
}
