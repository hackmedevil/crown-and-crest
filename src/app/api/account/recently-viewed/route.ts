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
    .from('account_recently_viewed')
    .select('product_id, viewed_at')
    .eq('firebase_uid', user.uid)
    .order('viewed_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to load recently viewed' }, { status: 500 })
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
    .from('account_recently_viewed')
    .upsert({
      firebase_uid: user.uid,
      product_id: productId,
      viewed_at: new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: 'Failed to update recently viewed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
