import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredNotifications } from '@/lib/notifications/actions'

/**
 * Notification Cleanup Cron Job
 * Runs daily to delete expired notifications
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
    console.log('[Cron] Running notification cleanup...')
    
    await cleanupExpiredNotifications()

    console.log('[Cron] Notification cleanup complete')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('[Cron] Notification cleanup failed:', error)
    
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
