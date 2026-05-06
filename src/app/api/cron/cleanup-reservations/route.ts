import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { logInfo, logError } from '@/lib/observability/structuredLogging'
import { trackCronError } from '@/lib/observability/errorTracking'
import { cronHealthMetrics, reportCronMetrics } from '@/lib/observability/cronMonitoring'

/**
 * Cleanup job for expired inventory reservations
 * 
 * This endpoint is triggered by Vercel Cron every 5-10 minutes.
 * It calls the release_expired_reservations() RPC to restore stock
 * for reservations that have passed their expiry timestamp.
 * 
 * Security: Protected by CRON_SECRET environment variable
 * 
 * Flow:
 * 1. Verify authorization token
 * 2. Call release_expired_reservations() RPC
 * 3. Log results
 * 4. Return success/failure
 * 
 * The RPC is idempotent and safe to run multiple times.
 * It only affects reservations where:
 * - status = 'reserved'
 * - expires_at < now()
 * 
 * Reservations with status 'committed' or 'released' are ignored.
 */
export async function GET(req: Request) {
  // 1️⃣ Security: Verify authorization token
  // This prevents unauthorized access to the cleanup endpoint
  const authHeader = req.headers.get('authorization')
  const expectedToken = process.env.CRON_SECRET

  if (!expectedToken) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    console.warn('Unauthorized cleanup attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const startTime = Date.now()

  try {
    // Log cron start
    cronHealthMetrics.logCronStart('cleanup_expired_reservations')

    // 2️⃣ Call the cleanup RPC
    // This function:
    // - Finds reservations where expires_at < now() AND status = 'reserved'
    // - Restores stock_quantity to variants
    // - Marks reservations as 'released'
    const { data, error } = await supabaseAdmin.rpc('release_expired_reservations')

    if (error) {
      const duration = Date.now() - startTime
      
      logError.cronExecutionFailed('cleanup_expired_reservations', error.message, duration)
      
      await trackCronError(error, 'cleanup_expired_reservations', { duration })

      cronHealthMetrics.logCronFailure('cleanup_expired_reservations', error.message, duration)

      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime

    // 3️⃣ Log results for monitoring
    const result = data as { ok: boolean; orders_processed?: number } | null
    const ordersProcessed = result?.orders_processed ?? 0

    logInfo.cronExecutionComplete('cleanup_expired_reservations', duration, ordersProcessed)

    cronHealthMetrics.logCronSuccess('cleanup_expired_reservations', ordersProcessed, duration)

    // Report metrics to monitoring endpoint
    await reportCronMetrics({
      cronName: 'cleanup_expired_reservations',
      startTime: new Date(Date.now() - duration).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      rowsProcessed: ordersProcessed,
      success: true,
      timestamp: new Date().toISOString(),
    })

    // 4️⃣ Return success response
    return NextResponse.json({
      success: true,
      orders_processed: ordersProcessed,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    const duration = Date.now() - startTime
    
    logError.cronExecutionFailed('cleanup_expired_reservations', error instanceof Error ? error.message : 'Unknown error', duration)

    await trackCronError(error, 'cleanup_expired_reservations', { duration })

    cronHealthMetrics.logCronFailure('cleanup_expired_reservations', error instanceof Error ? error.message : 'Unknown error', duration)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST endpoint for manual triggering (same logic as GET)
 * Useful for testing or manual intervention
 */
export async function POST(req: Request) {
  return GET(req)
}
