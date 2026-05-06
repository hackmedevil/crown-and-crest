// API Route: Send SMS Notification
// Admin-only endpoint to manually trigger SMS notifications

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendSMS } from '@/lib/sms/sms'
import { generateSMSMessage, getTrackingUrl } from '@/lib/sms/templates'
import { NotificationType } from '@/lib/sms/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/sms/send
 * Send SMS notification for an order
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify admin authorization
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await req.json()
    const { order_id, notification_type, custom_message } = body

    if (!order_id || !notification_type) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, notification_type' },
        { status: 400 }
      )
    }

    // 3. Fetch order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 4. Validate phone number
    if (!order.customer_phone) {
      return NextResponse.json(
        { error: 'Order has no customer phone number' },
        { status: 400 }
      )
    }

    // 5. Generate SMS message
    let message: string

    if (custom_message) {
      message = custom_message
    } else {
      const templateData = {
        orderId: order.id,
        amount: order.amount,
        courier: order.courier_name,
        trackingId: order.tracking_id,
        trackingUrl: order.tracking_id ? getTrackingUrl(order.tracking_id, order.courier_name) : undefined,
      }

      message = generateSMSMessage(notification_type as NotificationType, templateData)
    }

    // 6. Send SMS
    const result = await sendSMS({
      phone: order.customer_phone,
      message,
      orderId: order.id,
      notificationType: notification_type as NotificationType,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'SMS sent successfully',
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to send SMS',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[SMS_API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * GET /api/sms/send?order_id=xxx
 * Get SMS history for an order
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify admin authorization
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 2. Get order_id from query params
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id parameter' }, { status: 400 })
    }

    // 3. Fetch SMS history
    const { data: smsHistory, error } = await supabaseAdmin
      .from('sms_notifications')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[SMS_API] Error fetching SMS history:', error)
      return NextResponse.json({ error: 'Failed to fetch SMS history' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: smsHistory || [],
    })
  } catch (error) {
    console.error('[SMS_API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
