import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSMS, wasSMSSent } from '@/lib/sms/sms'
import { generateSMSMessage, getTrackingUrl } from '@/lib/sms/templates'
import { NotificationType } from '@/lib/sms/types'

export const dynamic = 'force-dynamic'

type AdminOrderAction =
  | 'MARK_PAID'
  | 'SEND_TO_PROVIDER'
  | 'MARK_IN_PRODUCTION'
  | 'MARK_SHIPPED'
  | 'MARK_OUT_FOR_DELIVERY'
  | 'MARK_DELIVERED'
  | 'CANCEL_ORDER'
  | 'REFUND_ORDER'

const ACTION_TO_STATUS: Record<AdminOrderAction, string> = {
  MARK_PAID: 'PAID',
  SEND_TO_PROVIDER: 'SENT_TO_PROVIDER',
  MARK_IN_PRODUCTION: 'IN_PRODUCTION',
  MARK_SHIPPED: 'SHIPPED',
  MARK_OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  MARK_DELIVERED: 'DELIVERED',
  CANCEL_ORDER: 'CANCELLED',
  REFUND_ORDER: 'REFUNDED',
}

function appendTimeline(existing: unknown, event: Record<string, unknown>) {
  const current = Array.isArray(existing) ? existing : []
  return [...current, event]
}

async function sendOrderUpdateNotification(params: {
  order: any
  notificationType: NotificationType
  trackingId?: string | null
  trackingUrl?: string | null
  courier?: string | null
}) {
  const { order, notificationType, trackingId, trackingUrl, courier } = params

  if (!order?.customer_phone) {
    return { sent: false, reason: 'NO_PHONE' as const }
  }

  const shouldSkip = await wasSMSSent(order.id, notificationType)
  if (shouldSkip) {
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

  const message = generateSMSMessage(notificationType, templateData)
  const result = await sendSMS({
    phone: order.customer_phone,
    message,
    orderId: order.id,
    notificationType,
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

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderId } = await params
    const body = await req.json().catch(() => ({}))

    const action = body.action as AdminOrderAction | undefined
    if (!action || !ACTION_TO_STATUS[action]) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, status, payment_status, order_timeline, customer_phone, amount, tracking_id, tracking_url, courier, courier_name')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const nextStatus = ACTION_TO_STATUS[action]
    const timelineEvent = {
      id: crypto.randomUUID(),
      event_type: action,
      previous_status: order.status,
      next_status: nextStatus,
      actor_uid: user.uid,
      actor_type: 'ADMIN',
      created_at: new Date().toISOString(),
      metadata: {
        courier: body.courier || body.courier_name || null,
        tracking_id: body.tracking_id || null,
        estimated_delivery: body.estimated_delivery || null,
      },
    }

    const patch: Record<string, unknown> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
      order_timeline: appendTimeline(order.order_timeline, timelineEvent),
    }

    if (action === 'SEND_TO_PROVIDER') {
      patch.provider = 'qikink'
    }

    if (action === 'MARK_SHIPPED') {
      if (!(body.courier || body.courier_name) || !body.tracking_id) {
        return NextResponse.json(
          { error: 'courier and tracking_id are required when marking shipped' },
          { status: 400 }
        )
      }
      patch.courier = body.courier || body.courier_name
      patch.courier_name = body.courier || body.courier_name
      patch.tracking_id = body.tracking_id
      patch.tracking_url = body.tracking_url || null
      patch.provider = 'qikink'
      if (body.estimated_delivery) {
        patch.estimated_delivery_date = body.estimated_delivery
      }
    }

    if (action === 'REFUND_ORDER') {
      patch.payment_status = 'REFUNDED'
      patch.refund_amount = body.refund_amount || null
    }

    if (action === 'CANCEL_ORDER' && order.payment_status === 'PAID') {
      patch.payment_status = 'REFUNDED'
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(patch)
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send appropriate WhatsApp notification based on action
    let notificationResult: { sent: boolean; reason?: string; messageId?: string | null } | null = null

    if (action === 'MARK_PAID') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'PAYMENT_CONFIRMED',
      })
    } else if (action === 'SEND_TO_PROVIDER') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'SENT_TO_LOGISTICS',
      })
    } else if (action === 'MARK_IN_PRODUCTION') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'ORDER_IN_PRODUCTION',
      })
    } else if (action === 'MARK_SHIPPED') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'SHIPPED',
        trackingId: String(body.tracking_id || ''),
        trackingUrl: body.tracking_url ? String(body.tracking_url) : null,
        courier: String(body.courier || body.courier_name || ''),
      })
    } else if (action === 'MARK_OUT_FOR_DELIVERY') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'OUT_FOR_DELIVERY',
        courier: body.courier || order.courier || order.courier_name || undefined,
      })
    } else if (action === 'MARK_DELIVERED') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'DELIVERED',
      })
    } else if (action === 'CANCEL_ORDER') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'CANCELLED',
      })
    } else if (action === 'REFUND_ORDER') {
      notificationResult = await sendOrderUpdateNotification({
        order,
        notificationType: 'REFUND_INITIATED',
      })
    }

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')

    return NextResponse.json({
      success: true,
      status: nextStatus,
      notification: notificationResult,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
