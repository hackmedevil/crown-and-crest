import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms/sms'
import { generateSMSMessage, getTrackingUrl } from '@/lib/sms/templates'

export const dynamic = 'force-dynamic'

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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_phone, amount, tracking_id, tracking_url, courier, courier_name')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.customer_phone) {
      return NextResponse.json({ error: 'Customer phone number not found for this order' }, { status: 400 })
    }

    if (!order.tracking_id && !order.tracking_url) {
      return NextResponse.json(
        { error: 'Tracking details are missing. Add tracking ID or tracking URL first.' },
        { status: 400 }
      )
    }

    const trackingId = order.tracking_id || undefined
    const trackingUrl = order.tracking_url || (trackingId ? getTrackingUrl(trackingId, order.courier || order.courier_name || undefined) : undefined)
    const courier = order.courier || order.courier_name || undefined

    const templateData = {
      orderId: order.order_number || order.id,
      amount: order.amount,
      courier,
      trackingId,
      trackingUrl,
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
      return NextResponse.json(
        { error: result.error || 'Failed to send shipment update' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId || null,
      message: 'Shipment update sent successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
