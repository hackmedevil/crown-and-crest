import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

type ShippingAddress = {
  fullName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function extractCustomerDetailsFromGatewayNotes(gatewayNotes: unknown): {
  name?: string
  phone?: string
  email?: string
} {
  const notes = toObject(gatewayNotes)
  if (!notes) return {}

  const payload = toObject(notes.payload)
  const payment = toObject(payload?.payment)
  const order = toObject(payload?.order)
  const paymentEntity = toObject(payment?.entity)
  const orderEntity = toObject(order?.entity)
  const paymentCustomer = toObject(paymentEntity?.customer_details)
  const orderCustomer = toObject(orderEntity?.customer_details)
  const paymentNotes = toObject(paymentEntity?.notes)
  const orderNotes = toObject(orderEntity?.notes)

  const name =
    (orderCustomer?.name as string | undefined) ||
    (paymentCustomer?.name as string | undefined)

  const phone =
    (orderCustomer?.contact as string | undefined) ||
    (paymentCustomer?.contact as string | undefined) ||
    (paymentEntity?.contact as string | undefined) ||
    (orderNotes?.phone as string | undefined) ||
    (paymentNotes?.phone as string | undefined)

  const email =
    (orderCustomer?.email as string | undefined) ||
    (paymentCustomer?.email as string | undefined)

  return {
    name,
    phone,
    email,
  }
}

function normalizeShippingAddress(value: unknown): ShippingAddress | null {
  const address = toObject(value)
  if (!address) return null

  const normalized: ShippingAddress = {
    fullName: typeof address.fullName === 'string' ? address.fullName : undefined,
    addressLine1: typeof address.addressLine1 === 'string' ? address.addressLine1 : undefined,
    addressLine2: typeof address.addressLine2 === 'string' ? address.addressLine2 : undefined,
    city: typeof address.city === 'string' ? address.city : undefined,
    state: typeof address.state === 'string' ? address.state : undefined,
    pincode: typeof address.pincode === 'string' ? address.pincode : undefined,
    country: typeof address.country === 'string' ? address.country : undefined,
  }

  return normalized
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const [
      shipmentsTotal,
      inTransit,
      outForDelivery,
      delivered,
      rtoInitiated,
      rtoDelivered,
      pending,
      latestShipments,
    ] = await Promise.all([
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact', head: true })
        .not('shiprocket_shipment_id', 'is', null),
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('shipment_status', 'IN_TRANSIT'),
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('shipment_status', 'OUT_FOR_DELIVERY'),
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('shipment_status', 'DELIVERED'),
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('shipment_status', 'RTO_INITIATED'),
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('shipment_status', 'RTO_DELIVERED'),
      supabaseAdmin.from('orders')
        .select('id', { count: 'exact', head: true })
        .in('shipment_status', ['PENDING', 'CREATED']),
      supabaseAdmin.from('orders')
        .select('id, created_at, courier_name, tracking_id, shipment_status, estimated_delivery_date, last_tracking_update, customer_name, customer_phone, customer_email, shipping_address, gateway_notes')
        .not('shiprocket_shipment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const shipments = (latestShipments.data || []).map((shipment) => {
      const gatewayCustomer = extractCustomerDetailsFromGatewayNotes(shipment.gateway_notes)
      const shippingAddress = normalizeShippingAddress(shipment.shipping_address)

      return {
        ...shipment,
        customer_name:
          shipment.customer_name ||
          shippingAddress?.fullName ||
          gatewayCustomer.name ||
          null,
        customer_phone:
          shipment.customer_phone ||
          gatewayCustomer.phone ||
          null,
        customer_email:
          shipment.customer_email ||
          gatewayCustomer.email ||
          null,
        shipping_address: shippingAddress,
      }
    })

    return NextResponse.json({
      counts: {
        shipments_total: shipmentsTotal.count || 0,
        in_transit: inTransit.count || 0,
        out_for_delivery: outForDelivery.count || 0,
        delivered: delivered.count || 0,
        rto_initiated: rtoInitiated.count || 0,
        rto_delivered: rtoDelivered.count || 0,
        pending: pending.count || 0,
      },
      shipments,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
