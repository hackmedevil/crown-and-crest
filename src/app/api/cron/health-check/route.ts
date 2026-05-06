import { NextRequest, NextResponse } from 'next/server'
import { runHealthCheck } from '@/lib/ai/health-monitor'

/**
 * Health Check Cron Job
 * Runs every 30 minutes to check AI model availability
 * 
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    console.log('[Cron] Running health check...')
    const startTime = Date.now()

    const results = await runHealthCheck()

    const duration = Date.now() - startTime

    console.log('[Cron] Health check complete:', results)

    return NextResponse.json({
      success: true,
      results,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('[Cron] Health check failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
