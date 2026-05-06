import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('account_offers')
    .select('id, offer_code, title, description, status, expires_at')
    .eq('firebase_uid', user.uid)
    .eq('status', 'active')
    .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
    .order('expires_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to load offers' }, { status: 500 })
  }

  return NextResponse.json({ offers: data ?? [] })
}
