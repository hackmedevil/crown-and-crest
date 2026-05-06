import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

type AddressRecord = {
  id: string
  fullName: string
  phone: string
  email: string
  addressLine: string
  city: string
  state: string
  pincode: string
  isDefault?: boolean
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function normalizeAddress(row: Record<string, unknown>, fallback: { fullName: string; phone: string; email: string }): AddressRecord | null {
  const addressLine = String(row.addressLine || row.addressLine1 || '').trim()
  const city = String(row.city || '').trim()
  const state = String(row.state || '').trim()
  const pincode = String(row.pincode || row.zip || '').trim()

  if (!addressLine || !city || !state || !pincode) {
    return null
  }

  return {
    id: [addressLine, city, state, pincode].join('|').toLowerCase(),
    fullName: String(row.fullName || fallback.fullName || '').trim(),
    phone: String(row.phone || fallback.phone || '').trim(),
    email: String(row.email || fallback.email || '').trim(),
    addressLine,
    city,
    state,
    pincode,
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [{ data: userRow }, { data: orderRows, error: ordersError }, { data: savedAddressRows, error: savedAddressError }] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('full_name, phone')
        .eq('firebase_uid', user.uid)
        .maybeSingle(),
      supabaseAdmin
        .from('orders')
        .select('id, created_at, customer_name, customer_phone, customer_email, shipping_address')
        .eq('firebase_uid', user.uid)
        .not('shipping_address', 'is', null)
        .order('created_at', { ascending: false })
        .limit(12),
      supabaseAdmin
        .from('account_addresses' as any)
        .select('id, full_name, phone, email, address_line1, address_line2, city, state, pincode, country, is_default, created_at')
        .eq('firebase_uid', user.uid)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (savedAddressError) {
      return NextResponse.json({ error: savedAddressError.message }, { status: 500 })
    }

    const latestOrder = orderRows?.[0]
    const savedAddresses = new Map<string, AddressRecord>()

    for (const row of savedAddressRows || []) {
      const normalizedId = String(row.id || '').trim()
      if (!normalizedId) continue

      savedAddresses.set(normalizedId, {
        id: normalizedId,
        fullName: String(row.full_name || userRow?.full_name || '').trim(),
        phone: String(row.phone || userRow?.phone || '').trim(),
        email: String(row.email || latestOrder?.customer_email || '').trim(),
        addressLine: String(row.address_line1 || '').trim(),
        city: String(row.city || '').trim(),
        state: String(row.state || '').trim(),
        pincode: String(row.pincode || '').trim(),
        isDefault: Boolean(row.is_default),
      })
    }

    for (const order of orderRows || []) {
      const shippingAddress = asRecord(order.shipping_address)
      if (!shippingAddress) {
        continue
      }

      const normalized = normalizeAddress(shippingAddress, {
        fullName: String(order.customer_name || userRow?.full_name || '').trim(),
        phone: String(order.customer_phone || userRow?.phone || '').trim(),
        email: String(order.customer_email || '').trim(),
      })

      if (!normalized || savedAddresses.has(normalized.id)) {
        continue
      }

      savedAddresses.set(normalized.id, {
        ...normalized,
        isDefault: savedAddresses.size === 0,
      })
    }

    const sortedAddresses = Array.from(savedAddresses.values()).sort((a, b) => {
      const defaultDiff = Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault))
      if (defaultDiff !== 0) return defaultDiff
      return 0
    })

    const primaryAddress = sortedAddresses.find((addr) => addr.isDefault) || sortedAddresses[0]

    return NextResponse.json({
      success: true,
      profile: {
        fullName: String(primaryAddress?.fullName || userRow?.full_name || latestOrder?.customer_name || '').trim(),
        phone: String(primaryAddress?.phone || userRow?.phone || latestOrder?.customer_phone || '').trim(),
        email: String(primaryAddress?.email || latestOrder?.customer_email || '').trim(),
        addresses: sortedAddresses,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load checkout profile' },
      { status: 500 }
    )
  }
}