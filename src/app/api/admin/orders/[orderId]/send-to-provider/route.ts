// POST /api/admin/orders/[orderId]/send-to-provider
// Sends a PAID order to Qikink for fulfillment.
//
// Steps:
//   1. Authenticate admin
//   2. Fetch order + items (with variant SKUs)
//   3. Validate order is in PAID status and not already submitted
//   4. Build Qikink payload
//   5. POST to Qikink /api/order/create
//   6. Store provider_order_id + update status → SENT_TO_PROVIDER

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createQikinkOrder } from '@/lib/qikink/client'
import { QikinkCreateOrderRequest, QikinkShippingAddress, QikinkLineItem } from '@/lib/qikink/types'

export const dynamic = 'force-dynamic'

function appendTimeline(existing: unknown, event: Record<string, unknown>) {
  const current = Array.isArray(existing) ? existing : []
  return [...current, event]
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // 1. Admin auth
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const adminUids = process.env.ADMIN_UIDS?.split(',') ?? []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderId } = await params

    // 2. Fetch order with items + variant SKUs
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        provider,
        provider_order_id,
        amount,
        is_cod,
        payment_method,
        customer_email,
        customer_phone,
        shipping_address,
        order_timeline,
        order_items (
          id,
          quantity,
          unit_price,
          product_name,
          variant_label,
          variants:variant_id ( sku, size, color )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 3. Validate prerequisites
    if (order.status !== 'PAID') {
      return NextResponse.json(
        { error: `Order must be in PAID status before sending to provider (current: ${order.status})` },
        { status: 422 }
      )
    }

    if (order.provider_order_id) {
      return NextResponse.json(
        { error: 'Order already submitted to provider', provider_order_id: order.provider_order_id },
        { status: 409 }
      )
    }

    // 4. Build Qikink payload
    const address =
      order.shipping_address && typeof order.shipping_address === 'object'
        ? (order.shipping_address as Record<string, unknown>)
        : {}

    const fullName = typeof address.fullName === 'string' ? address.fullName.trim() : ''
    if (!fullName) {
      return NextResponse.json({ error: 'Shipping address fullName is required' }, { status: 422 })
    }

    const { firstName, lastName } = splitFullName(fullName)
    const phone =
      (typeof order.customer_phone === 'string' && order.customer_phone.trim()) ||
      (typeof address.phone === 'string' && address.phone.trim()) ||
      ''
    const email =
      (typeof order.customer_email === 'string' && order.customer_email.trim()) ||
      (typeof address.email === 'string' && address.email.trim()) ||
      ''

    if (!phone) {
      return NextResponse.json({ error: 'Customer phone is required' }, { status: 422 })
    }

    const shippingAddress: QikinkShippingAddress = {
      first_name: firstName,
      ...(lastName && { last_name: lastName }),
      address1: typeof address.addressLine1 === 'string' ? address.addressLine1.trim() : '',
      ...(address.addressLine2 && typeof address.addressLine2 === 'string' && address.addressLine2.trim()
        ? { address2: address.addressLine2.trim() }
        : {}),
      phone: phone.replace(/\D/g, '').replace(/^91/, ''),
      email,
      city: typeof address.city === 'string' ? address.city.trim() : '',
      zip: String(address.pincode || address.zip || '').replace(/\D/g, ''),
      province: typeof address.state === 'string' ? address.state.trim() : '',
      country_code: typeof address.country_code === 'string' ? address.country_code.toUpperCase() : 'IN',
    }

    if (!shippingAddress.address1 || !shippingAddress.city || !shippingAddress.zip) {
      return NextResponse.json({ error: 'Incomplete shipping address' }, { status: 422 })
    }

    // Build line items from order_items
    const orderItems = Array.isArray(order.order_items) ? order.order_items : []
    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Order has no items' }, { status: 422 })
    }

    const lineItems: QikinkLineItem[] = orderItems.map((item: Record<string, unknown>, i: number) => {
      const variant = item.variants as Record<string, unknown> | null
      const sku = typeof variant?.sku === 'string' ? variant.sku.trim() : ''
      if (!sku) {
        throw new Error(`Order item ${i + 1} (${item.product_name}) is missing a supplier SKU`)
      }
      return {
        search_from_my_products: 1,
        quantity: item.quantity as number,
        sku,
      }
    })

    const isCod = order.is_cod === true || order.payment_method === 'COD'
    const gateway: 'COD' | 'PREPAID' = isCod ? 'COD' : 'PREPAID'

    const qikinkPayload: QikinkCreateOrderRequest = {
      order_number: order.order_number ?? order.id,
      qikink_shipping: '1',
      gateway,
      total_order_value: String(order.amount),
      line_items: lineItems,
      shipping_address: shippingAddress,
    }

    // 5. POST to Qikink
    const qikinkResponse = await createQikinkOrder(qikinkPayload)

    const providerOrderId = String(qikinkResponse.order_id)

    // 6. Update DB
    const timelineEvent = {
      id: crypto.randomUUID(),
      event_type: 'SEND_TO_PROVIDER',
      previous_status: order.status,
      next_status: 'SENT_TO_PROVIDER',
      actor_uid: user.uid,
      actor_type: 'ADMIN',
      created_at: new Date().toISOString(),
      metadata: {
        provider: 'qikink',
        provider_order_id: providerOrderId,
        qikink_response: qikinkResponse.message,
      },
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'SENT_TO_PROVIDER',
        provider: 'qikink',
        provider_order_id: providerOrderId,
        updated_at: new Date().toISOString(),
        order_timeline: appendTimeline(order.order_timeline, timelineEvent),
      })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/admin/orders')

    return NextResponse.json({
      success: true,
      status: 'SENT_TO_PROVIDER',
      provider: 'qikink',
      provider_order_id: providerOrderId,
      message: qikinkResponse.message,
    })
  } catch (error) {
    console.error('[SEND_TO_PROVIDER]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
