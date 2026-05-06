import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids =
      process.env.ADMIN_UIDS?.split(',').map((uid) => uid.trim()).filter(Boolean) || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Keep status filters aligned with current DB enum values.
    const paidStatuses = ['PAID', 'FULFILLMENT_PENDING', 'SHIPPED', 'DELIVERED', 'DISPUTED', 'REFUNDED']
    const failedStatuses = ['FAILED', 'CANCELLED', 'ABANDONED']

    const [
      ordersTotal,
      ordersPaid,
      ordersPending,
      ordersAuthorized,
      ordersFailed,
      refundCount,
      disputeCount,
      refundSum,
      disputeSum,
      webhookLogs,
      abandonedCount,
    ] = await Promise.all([
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).in('status', paidStatuses),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'PAYMENT_PENDING'),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'PAYMENT_AUTHORIZED'),
      supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).in('status', failedStatuses),
      supabaseAdmin.from('order_refunds').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('order_disputes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('order_refunds').select('amount'),
      supabaseAdmin.from('order_disputes').select('amount'),
      supabaseAdmin.from('webhook_logs')
        .select('id, event_type, order_id, received_at')
        .order('received_at', { ascending: false })
        .limit(20),
      supabaseAdmin.from('abandoned_checkouts').select('id', { count: 'exact', head: true }),
    ])

    const totalRefundAmount = (refundSum.data || []).reduce((sum, row) => sum + (row.amount || 0), 0)
    const totalDisputeAmount = (disputeSum.data || []).reduce((sum, row) => sum + (row.amount || 0), 0)

    return NextResponse.json({
      counts: {
        orders_total: ordersTotal.count || 0,
        orders_paid: ordersPaid.count || 0,
        orders_pending: ordersPending.count || 0,
        orders_authorized: ordersAuthorized.count || 0,
        orders_failed: ordersFailed.count || 0,
        refunds_total: refundCount.count || 0,
        disputes_total: disputeCount.count || 0,
        abandoned_checkouts: abandonedCount.count || 0,
      },
      amounts: {
        refunds_total: totalRefundAmount,
        disputes_total: totalDisputeAmount,
      },
      webhooks: webhookLogs.data || [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
