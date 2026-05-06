import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type AddressUpdatePayload = {
  fullName?: string
  phone?: string
  email?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
  isDefault?: boolean
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function validateAddress(body: AddressUpdatePayload) {
  const fullName = normalizeText(body.fullName)
  const phone = normalizeText(body.phone)
  const email = normalizeText(body.email)
  const addressLine1 = normalizeText(body.addressLine1)
  const addressLine2 = normalizeText(body.addressLine2)
  const city = normalizeText(body.city)
  const state = normalizeText(body.state)
  const pincode = normalizeText(body.pincode)
  const country = normalizeText(body.country) || 'India'

  if (!fullName || fullName.length < 2) return { error: 'Full name is required' }
  if (!phone || phone.length < 10) return { error: 'Valid contact number is required' }
  if (!addressLine1 || addressLine1.length < 5) return { error: 'Address line is required' }
  if (!city) return { error: 'City is required' }
  if (!state) return { error: 'State is required' }
  if (!/^\d{6}$/.test(pincode)) return { error: 'Valid 6-digit pincode is required' }

  return {
    fullName,
    phone,
    email: email || null,
    addressLine1,
    addressLine2: addressLine2 || null,
    city,
    state,
    pincode,
    country,
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { addressId } = await params
  const body = (await request.json()) as AddressUpdatePayload
  const validated = validateAddress(body)
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  const makeDefault = Boolean(body.isDefault)
  if (makeDefault) {
    await supabaseAdmin
      .from('account_addresses' as any)
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('firebase_uid', user.uid)
  }

  const { data, error } = await supabaseAdmin
    .from('account_addresses' as any)
    .update({
      full_name: validated.fullName,
      phone: validated.phone,
      email: validated.email,
      address_line1: validated.addressLine1,
      address_line2: validated.addressLine2,
      city: validated.city,
      state: validated.state,
      pincode: validated.pincode,
      country: validated.country,
      is_default: makeDefault,
      updated_at: new Date().toISOString(),
    })
    .eq('id', addressId)
    .eq('firebase_uid', user.uid)
    .select('id, full_name, phone, email, address_line1, address_line2, city, state, pincode, country, is_default, created_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }

  return NextResponse.json({
    address: {
      id: data.id,
      fullName: data.full_name,
      phone: data.phone,
      email: data.email,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country,
      isDefault: data.is_default,
      createdAt: data.created_at,
    },
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ addressId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { addressId } = await params

  const { data: target } = await supabaseAdmin
    .from('account_addresses' as any)
    .select('id, is_default')
    .eq('id', addressId)
    .eq('firebase_uid', user.uid)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('account_addresses' as any)
    .delete()
    .eq('id', addressId)
    .eq('firebase_uid', user.uid)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }

  if (target?.is_default) {
    const { data: firstRemaining } = await supabaseAdmin
      .from('account_addresses' as any)
      .select('id')
      .eq('firebase_uid', user.uid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (firstRemaining?.id) {
      await supabaseAdmin
        .from('account_addresses' as any)
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', firstRemaining.id)
        .eq('firebase_uid', user.uid)
    }
  }

  return NextResponse.json({ success: true })
}
