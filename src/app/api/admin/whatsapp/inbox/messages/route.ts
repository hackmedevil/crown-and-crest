import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function ensureAdmin() {
  const user = await getCurrentUser()
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const adminUids = (process.env.ADMIN_UIDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!adminUids.includes(user.uid)) {
    return { ok: false as const, status: 403, error: 'Forbidden: Admin access required' }
  }

  return { ok: true as const }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await ensureAdmin()
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status })
    }

    const { searchParams } = new URL(req.url)
    const waId = (searchParams.get('wa_id') || '').trim()

    if (!waId) {
      return NextResponse.json({ error: 'Missing wa_id' }, { status: 400 })
    }

    const { data: conv, error: convErr } = await supabaseAdmin
      .from('whatsapp_conversations' as any)
      .select('id')
      .eq('wa_id', waId)
      .maybeSingle()

    if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 })
    if (!conv?.id) return NextResponse.json({ success: true, data: [] })

    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages' as any)
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
