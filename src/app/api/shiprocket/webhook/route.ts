import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { mapShiprocketStatus } from '@/lib/shiprocket/shipment'
import { sendSMS } from '@/lib/sms/sms'
import { generateSMSMessage, getTrackingUrl } from '@/lib/sms/templates'
import { OrderStatus } from '@/types/order'

export const dynamic = 'force-dynamic'

/**
 * Shiprocket Webhook Handler
 * 
 * Receives tracking updates from Shiprocket
 * Updates order shipment status in database
 * 
 * Events handled:
 * - SHIPMENT_CREATED
 * - PICKUP_SCHEDULED
 * - PICKED_UP
 * - IN_TRANSIT
 * - OUT_FOR_DELIVERY
 * - DELIVERED
 * - RTO_INITIATED
 * - RTO_DELIVERED
 */
export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  try {
    const tokenHeader = req.headers.get('x-api-key')
    const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN
    if (webhookToken && tokenHeader !== webhookToken) {
      console.error('[SHIPROCKET_WEBHOOK] Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const rawBody = await req.text()
    if (!rawBody) {
      return NextResponse.json({ success: true })
    }
    const signature = req.headers.get('x-shiprocket-signature')

    // Verify webhook signature (if Shiprocket provides one)
    if (process.env.SHIPROCKET_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.SHIPROCKET_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex')

      if (expectedSignature !== signature) {
        console.error('[SHIPROCKET_WEBHOOK] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ success: true })
    }
    console.log('[SHIPROCKET_WEBHOOK] Received event:', event.event)

    const { data } = event
    const { awb, order_id, shipment_status, current_status, courier_name, activities } = data

    // Find order by Shiprocket order ID or AWB
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, shipment_status, tracking_id, actual_delivery_date, customer_phone, amount, courier_name')
      .or(`shiprocket_order_id.eq.${order_id},tracking_id.eq.${awb}`)
      .single()

    if (orderError || !order) {
      console.error('[SHIPROCKET_WEBHOOK] Order not found:', order_id, awb)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Map Shiprocket status to our internal shipment status
    const newShipmentStatus = mapShiprocketStatus(current_status || shipment_status)

    // Determine if we should update main order status
    let newOrderStatus: OrderStatus | null = null
    let smsNotificationType: 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | null = null

    switch (newShipmentStatus) {
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        newOrderStatus = 'SHIPPED'
        if (order.status !== 'SHIPPED') {
          smsNotificationType = 'SHIPPED'
        }
        break

      case 'OUT_FOR_DELIVERY':
        newOrderStatus = 'OUT_FOR_DELIVERY'
        smsNotificationType = 'OUT_FOR_DELIVERY'
        break

      case 'DELIVERED':
        newOrderStatus = 'DELIVERED'
        smsNotificationType = 'DELIVERED'
        break

      case 'RTO_INITIATED':
      case 'RTO_DELIVERED':
        newOrderStatus = 'CANCELLED'
        break
    }

    // Update order with latest tracking info
    const updatedata: Record<string, unknown> = {
      shipment_status: newShipmentStatus,
      last_tracking_update: new Date().toISOString(),
    }

    // Update main order status if changed
    if (newOrderStatus) {
      updatedata.status = newOrderStatus
    }

    // Update courier name if provided
    if (courier_name) {
      updatedata.courier_name = courier_name
    }

    // Update tracking ID if provided
    if (awb && !order.tracking_id) {
      updatedata.tracking_id = awb
    }

    // Set delivery date if delivered
    if (newShipmentStatus === 'DELIVERED' && !order.actual_delivery_date) {
      updatedata.actual_delivery_date = new Date().toISOString().split('T')[0]
    }

    await supabaseAdmin
      .from('orders')
      .update(updatedata)
      .eq('id', order.id)

    console.log('[SHIPROCKET_WEBHOOK] Order updated:', order.id, 'Shipment Status:', newShipmentStatus, 'Order Status:', newOrderStatus)

    // Send SMS notification if status changed to key milestone
    if (smsNotificationType && order.customer_phone) {
      try {
        const message = generateSMSMessage(smsNotificationType, {
          orderId: order.id,
          amount: order.amount,
          courier: courier_name || order.courier_name,
          trackingId: awb || order.tracking_id,
          trackingUrl: awb ? getTrackingUrl(awb, courier_name) : undefined,
        })

        await sendSMS({
          phone: order.customer_phone,
          message,
          orderId: order.id,
          notificationType: smsNotificationType,
        })

        console.log('[SHIPROCKET_WEBHOOK] SMS sent:', smsNotificationType)
      } catch (smsError) {
        console.error('[SHIPROCKET_WEBHOOK] Failed to send SMS:', smsError)
        // Don't fail webhook if SMS fails
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[SHIPROCKET_WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
