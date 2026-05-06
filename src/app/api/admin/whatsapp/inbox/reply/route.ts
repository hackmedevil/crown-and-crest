import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const GRAPH_API_VERSION = 'v22.0'

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

async function ensureConversation(waId: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('whatsapp_conversations' as any)
    .select('id')
    .eq('wa_id', waId)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to load conversation: ${existingError.message}`)
  }

  if (existing?.id) return String(existing.id)

  const { data: created, error } = await supabaseAdmin
    .from('whatsapp_conversations' as any)
    .insert({
      wa_id: waId,
      unread_count: 0,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`)
  }

  if (!created?.id) return null
  return String(created.id)
}

export async function POST(req: NextRequest) {
  try {
    const admin = await ensureAdmin()
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status })
    }

    const { wa_id, message } = await req.json()
    const waId = String(wa_id || '').replace(/\D/g, '')
    const text = String(message || '').trim()

    if (!waId || !text) {
      return NextResponse.json({ error: 'wa_id and message are required' }, { status: 400 })
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'WhatsApp credentials missing' }, { status: 500 })
    }

    const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: waId,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: payload?.error?.message || 'Failed to send WhatsApp message',
          details: payload?.error || null,
        },
        { status: response.status }
      )
    }

    const providerMessageId = payload?.messages?.[0]?.id ? String(payload.messages[0].id) : null
    const nowIso = new Date().toISOString()
    const conversationId = await ensureConversation(waId)

    if (conversationId) {
      const { error: insertError } = await supabaseAdmin
        .from('whatsapp_messages' as any)
        .insert({
          conversation_id: conversationId,
          wa_id: waId,
          message_id: providerMessageId,
          direction: 'outbound',
          message_type: 'text',
          text_body: text,
          status: 'sent',
          sent_at: nowIso,
          raw_payload: payload,
        })

      if (insertError) {
        throw new Error(`Failed to store outbound message: ${insertError.message}`)
      }

      const { error: conversationUpdateError } = await supabaseAdmin
        .from('whatsapp_conversations' as any)
        .update({
          last_message_text: text,
          last_message_at: nowIso,
          last_outbound_message_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', conversationId)

      if (conversationUpdateError) {
        throw new Error(`Failed to update conversation summary: ${conversationUpdateError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message_id: providerMessageId,
      wa_id: waId,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
