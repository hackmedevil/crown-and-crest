// GET /api/admin/orders/[orderId]
// Enhanced order detail endpoint – returns a structured JSON response with customer,
// shipping, provider, and item sections as defined in the Phase 3 spec.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        amount,
        currency,
        provider,
        provider_order_id,
        tracking_id,
        tracking_url,
        courier,
        courier_name,
        customer_email,
        customer_phone,
        shipping_address,
        created_at,
        updated_at,
        order_timeline,
        internal_notes,
        order_items (
          id,
          quantity,
          unit_price,
          product_name,
          variant_label,
          image_url,
          variants:variant_id ( sku, size, color )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const addr =
      order.shipping_address && typeof order.shipping_address === 'object'
        ? (order.shipping_address as Record<string, unknown>)
        : {}

    const shippingName = typeof addr.fullName === 'string' ? addr.fullName : ''
    const shippingPhone =
      order.customer_phone ??
      (typeof addr.phone === 'string' ? addr.phone : null)
    const shippingAddress = [
      typeof addr.addressLine1 === 'string' ? addr.addressLine1 : '',
      typeof addr.addressLine2 === 'string' && addr.addressLine2 ? addr.addressLine2 : '',
      typeof addr.city === 'string' ? addr.city : '',
      typeof addr.state === 'string' ? addr.state : '',
      typeof addr.pincode === 'string' ? addr.pincode : '',
    ]
      .filter(Boolean)
      .join(', ')

    const items = (Array.isArray(order.order_items) ? order.order_items : []).map(
      (item: Record<string, unknown>) => {
        const variant = item.variants as Record<string, unknown> | null
        return {
          id: item.id,
          sku: typeof variant?.sku === 'string' ? variant.sku : null,
          name: item.product_name,
          size: typeof variant?.size === 'string' ? variant.size : item.variant_label,
          color: typeof variant?.color === 'string' ? variant.color : null,
          quantity: item.quantity,
          price: item.unit_price,
          image_url: item.image_url ?? null,
        }
      }
    )

    return NextResponse.json({
      order_id: order.order_number ?? order.id,
      internal_id: order.id,
      status: order.status,
      payment_status: order.payment_status,

      customer: {
        name: shippingName || null,
        email: order.customer_email ?? null,
        phone: order.customer_phone ?? null,
      },

      shipping: {
        name: shippingName || null,
        phone: shippingPhone ?? null,
        address: shippingAddress || null,
        pincode: typeof addr.pincode === 'string' ? addr.pincode : null,
        city: typeof addr.city === 'string' ? addr.city : null,
        state: typeof addr.state === 'string' ? addr.state : null,
      },

      provider: {
        name: order.provider ?? 'qikink',
        provider_order_id: order.provider_order_id ?? null,
        tracking_id: order.tracking_id ?? null,
        tracking_url: order.tracking_url ?? null,
        courier: order.courier ?? order.courier_name ?? null,
      },

      items,
      total_amount: order.amount,
      currency: order.currency ?? 'INR',

      timeline: Array.isArray(order.order_timeline) ? order.order_timeline : [],
      internal_notes: Array.isArray(order.internal_notes) ? order.internal_notes : [],

      created_at: order.created_at,
      updated_at: order.updated_at,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
