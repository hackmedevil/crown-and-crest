import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('account_wishlist_items')
    .select('id, product_id, price_alert, stock_alert, created_at')
    .eq('firebase_uid', user.uid)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load wishlist' }, { status: 500 })
  }

  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const productId = body?.productId
  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('account_wishlist_items')
    .upsert({
      firebase_uid: user.uid,
      product_id: productId,
      price_alert: Boolean(body?.priceAlert),
      stock_alert: Boolean(body?.stockAlert),
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const productId = body?.productId
  if (!productId) {
    return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('account_wishlist_items')
    .delete()
    .eq('firebase_uid', user.uid)
    .eq('product_id', productId)

  if (error) {
    return NextResponse.json({ error: 'Failed to remove wishlist item' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
