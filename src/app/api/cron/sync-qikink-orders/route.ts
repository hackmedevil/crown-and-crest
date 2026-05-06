// GET /api/cron/sync-qikink-orders
// Automated 15-minute cron job: syncs Qikink fulfillment status into the local DB
// and triggers customer SMS notifications for key transitions.
//
// Auth: Bearer token via CRON_SECRET env var (standard Vercel cron pattern).

import { NextRequest, NextResponse } from 'next/server'
import { performQikinkSync } from '@/lib/qikink/sync'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    // If CRON_SECRET is not configured, block non-localhost callers
    const host = req.headers.get('host') ?? ''
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
    }
  } else {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const start = Date.now()
  console.log('[CRON_QIKINK_SYNC] Starting sync at', new Date().toISOString())

  try {
    const result = await performQikinkSync()

    const durationMs = Date.now() - start
    console.log(
      `[CRON_QIKINK_SYNC] Done in ${durationMs}ms: processed=${result.processed} updated=${result.updated}`
    )

    return NextResponse.json({
      success: true,
      processed: result.processed,
      updated: result.updated,
      duration_ms: durationMs,
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[CRON_QIKINK_SYNC] Error after', durationMs, 'ms:', message)

    return NextResponse.json(
      { error: message, duration_ms: durationMs },
      { status: 500 }
    )
  }
}
