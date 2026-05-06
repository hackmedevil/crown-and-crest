import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type ReservationRow = {
  id: string
  order_id: string
  variant_id: string
  quantity: number
  reserved_at: string | null
  expires_at: string | null
}

type OrderSummary = {
  order_id: string
  earliest_reserved_at: string | null
  latest_expires_at: string | null
  is_expired: boolean
}

/**
 * Admin-only reservation health endpoint.
 *
 * Use this to detect stuck reservations and TTL breaches.
 * Query params:
 * - limit: max rows to sample in stale_reservations (default 25, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const limitParam = Number(searchParams.get('limit') || '25')
    const sampleLimit = Number.isFinite(limitParam)
      ? Math.min(Math.max(Math.floor(limitParam), 1), 100)
      : 25

    const now = new Date()

    const [{ count: reservedCount, error: reservedCountError }, { count: expiredCount, error: expiredCountError }] = await Promise.all([
      supabaseAdmin
        .from('stock_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'reserved'),
      supabaseAdmin
        .from('stock_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'reserved')
        .lt('expires_at', now.toISOString()),
    ])

    if (reservedCountError || expiredCountError) {
      throw reservedCountError || expiredCountError
    }

    const { data: reservedRowsData, error: reservedRowsError } = await supabaseAdmin
      .from('stock_reservations')
      .select('id, order_id, variant_id, quantity, reserved_at, expires_at')
      .eq('status', 'reserved')
      .order('reserved_at', { ascending: true })
      .limit(2000)

    if (reservedRowsError) {
      throw reservedRowsError
    }

    const reservedRows = (reservedRowsData || []) as ReservationRow[]

    let maxMinutesPastTtl = 0

    const byOrder = new Map<string, OrderSummary>()

    for (const row of reservedRows) {
      const isExpired = !!row.expires_at && new Date(row.expires_at) < now
      if (isExpired) {
        const minutesPast = Math.max(
          0,
          Math.floor((now.getTime() - new Date(row.expires_at as string).getTime()) / 60000)
        )
        if (minutesPast > maxMinutesPastTtl) {
          maxMinutesPastTtl = minutesPast
        }
      }

      const existing = byOrder.get(row.order_id)
      if (!existing) {
        byOrder.set(row.order_id, {
          order_id: row.order_id,
          earliest_reserved_at: row.reserved_at,
          latest_expires_at: row.expires_at,
          is_expired: isExpired,
        })
      } else {
        if (row.reserved_at && (!existing.earliest_reserved_at || new Date(row.reserved_at) < new Date(existing.earliest_reserved_at))) {
          existing.earliest_reserved_at = row.reserved_at
        }
        if (row.expires_at && (!existing.latest_expires_at || new Date(row.expires_at) > new Date(existing.latest_expires_at))) {
          existing.latest_expires_at = row.expires_at
        }
        if (isExpired) {
          existing.is_expired = true
        }
      }
    }

    const staleOrders = Array.from(byOrder.values())
      .filter((order) => order.is_expired)
      .map((order) => ({
        order_id: order.order_id,
        reserved_at: order.earliest_reserved_at!,
        expired_at: order.latest_expires_at!,
        minutes_past_ttl: order.latest_expires_at
          ? Math.floor((now.getTime() - new Date(order.latest_expires_at).getTime()) / 60000)
          : 0,
      }))
      .sort((a, b) => {
        const aTime = new Date(a.reserved_at).getTime()
        const bTime = new Date(b.reserved_at).getTime()
        return aTime - bTime
      })
      .slice(0, sampleLimit)

    const staleReservations = reservedRows
      .filter((row) => !!row.expires_at && new Date(row.expires_at) < now)
      .map((row) => ({
        id: row.id,
        order_id: row.order_id,
        variant_id: row.variant_id,
        reserved_quantity: row.quantity,
        reserved_at: row.reserved_at,
        expires_at: row.expires_at,
        minutes_past_expiry: Math.floor((now.getTime() - new Date(row.expires_at!).getTime()) / 60000),
      }))
      .slice(0, sampleLimit)

    return NextResponse.json({
      ok: true,
      sampled_at: now.toISOString(),
      summary: {
        total_reservations: reservedCount || 0,
        reserved_count: reservedCount || 0,
        expired_count: expiredCount || 0,
        ttl_breach: (expiredCount || 0) > 0,
        max_minutes_past_ttl: maxMinutesPastTtl > 0 ? maxMinutesPastTtl : null,
      },
      stale_orders: staleOrders,
      stale_reservations: staleReservations,
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
