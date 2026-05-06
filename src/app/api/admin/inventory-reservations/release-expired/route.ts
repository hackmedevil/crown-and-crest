import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Admin-only endpoint to manually release expired reservations.
 * Calls release_expired_reservations() RPC and returns processed count.
 */
export async function POST() {
  try {
    await requireAdmin()

    const { data, error } = await supabaseAdmin.rpc('release_expired_reservations')

    if (error) {
      throw error
    }

    const result = data as { ok?: boolean; orders_processed?: number } | null

    return NextResponse.json({
      ok: true,
      orders_processed: result?.orders_processed ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
