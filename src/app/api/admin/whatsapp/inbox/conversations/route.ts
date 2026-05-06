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

export async function GET(req: NextRequest) {
  try {
    const admin = await ensureAdmin()
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status })
    }

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('q') || '').trim().toLowerCase()
    const limit = Math.min(Number(searchParams.get('limit') || 100), 200)

    const { data, error } = await supabaseAdmin
      .from('whatsapp_conversations' as any)
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let rows = Array.isArray(data) ? data : []
    if (q) {
      rows = rows.filter((row: any) => {
        const waId = String(row?.wa_id || '').toLowerCase()
        const name = String(row?.contact_name || '').toLowerCase()
        const lastText = String(row?.last_message_text || '').toLowerCase()
        return waId.includes(q) || name.includes(q) || lastText.includes(q)
      })
    }

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
