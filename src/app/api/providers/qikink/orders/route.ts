// GET /api/providers/qikink/orders
// Admin-only endpoint: runs a full Qikink sync (fetch → match → update DB → notify).
// Returns a structured summary of what changed.
//
// Also used by the cron job indirectly via the shared sync engine.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { performQikinkSync } from '@/lib/qikink/sync'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const adminUids = process.env.ADMIN_UIDS?.split(',') ?? []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('[QIKINK_ORDERS] Admin sync triggered by:', user.uid)

    const syncResult = await performQikinkSync()

    return NextResponse.json({
      success: true,
      processed: syncResult.processed,
      updated: syncResult.updated,
      results: syncResult.results,
    })
  } catch (error) {
    console.error('[QIKINK_ORDERS]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
