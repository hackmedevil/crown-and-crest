// POST /api/admin/orders/[orderId]/tracking
// Manual tracking fallback – set tracking fields without triggering Qikink.
// Use when automatic sync fails or tracking needs manual correction.

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSMS, wasSMSSent } from '@/lib/sms/sms'
import { generateSMSMessage, getTrackingUrl } from '@/lib/sms/templates'

export const dynamic = 'force-dynamic'

function appendTimeline(existing: unknown, event: Record<string, unknown>) {
  const current = Array.isArray(existing) ? existing : []
  return [...current, event]
}

async function sendTrackingUpdateNotification(params: {
  order: any
  trackingId?: string | null
  trackingUrl?: string | null
  courier?: string | null
}) {
  const { order, trackingId, trackingUrl, courier } = params

  if (!order?.customer_phone) {
    return { sent: false, reason: 'NO_PHONE' as const }
  }

  const recentlySent = await wasSMSSent(order.id, 'SHIPPED')
  if (recentlySent) {
    return { sent: false, reason: 'RECENTLY_SENT' as const }
  }

  const resolvedTrackingId = trackingId || order.tracking_id || null
  const resolvedCourier = courier || order.courier || order.courier_name || null
  const resolvedTrackingUrl =
    trackingUrl ||
    order.tracking_url ||
    (resolvedTrackingId ? getTrackingUrl(resolvedTrackingId, resolvedCourier || undefined) : undefined)

  const templateData = {
    orderId: order.order_number || order.id,
    amount: order.amount,
    courier: resolvedCourier || undefined,
    trackingId: resolvedTrackingId || undefined,
    trackingUrl: resolvedTrackingUrl || undefined,
  }

  const message = generateSMSMessage('SHIPPED', templateData)
  const result = await sendSMS({
    phone: order.customer_phone,
    message,
    orderId: order.id,
    notificationType: 'SHIPPED',
    templateData,
  })

  if (!result.success) {
    return { sent: false, reason: result.error || 'SEND_FAILED' }
  }

  return { sent: true, messageId: result.messageId || null }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const adminUids = process.env.ADMIN_UIDS?.split(',') ?? []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderId } = await params
    const body = await req.json().catch(() => ({}))

    const tracking_id = typeof body.tracking_id === 'string' ? body.tracking_id.trim() : null
    const tracking_url = typeof body.tracking_url === 'string' ? body.tracking_url.trim() : null
    const courier = typeof body.courier === 'string' ? body.courier.trim() : null

    if (!tracking_id && !tracking_url) {
      return NextResponse.json(
        { error: 'At least one of tracking_id or tracking_url is required' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, order_timeline, customer_phone, amount, tracking_id, tracking_url, courier, courier_name')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (tracking_id) patch.tracking_id = tracking_id
    if (tracking_url) patch.tracking_url = tracking_url
    if (courier) {
      patch.courier = courier
      patch.courier_name = courier
    }

    const timelineEvent = {
      id: crypto.randomUUID(),
      event_type: 'MANUAL_TRACKING_UPDATE',
      actor_uid: user.uid,
      actor_type: 'ADMIN',
      created_at: new Date().toISOString(),
      metadata: { tracking_id, tracking_url, courier },
    }
    patch.order_timeline = appendTimeline(order.order_timeline, timelineEvent)

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(patch)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const notification = await sendTrackingUpdateNotification({
      order,
      trackingId: tracking_id,
      trackingUrl: tracking_url,
      courier,
    })

    revalidatePath(`/admin/orders/${orderId}`)

    return NextResponse.json({ success: true, tracking_id, tracking_url, courier, notification })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
