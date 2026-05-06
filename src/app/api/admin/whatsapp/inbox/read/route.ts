import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

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

export async function POST(req: NextRequest) {
  try {
    const admin = await ensureAdmin()
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status })
    }

    const { wa_id } = await req.json()
    const waId = String(wa_id || '').replace(/\D/g, '')

    if (!waId) {
      return NextResponse.json({ error: 'wa_id is required' }, { status: 400 })
    }

    const { data: conv } = await supabaseAdmin
      .from('whatsapp_conversations' as any)
      .select('id')
      .eq('wa_id', waId)
      .maybeSingle()

    if (conv?.id) {
      await supabaseAdmin
        .from('whatsapp_conversations' as any)
        .update({ unread_count: 0, updated_at: new Date().toISOString() })
        .eq('id', conv.id)

      await supabaseAdmin
        .from('whatsapp_messages' as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conv.id)
        .eq('direction', 'inbound')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
