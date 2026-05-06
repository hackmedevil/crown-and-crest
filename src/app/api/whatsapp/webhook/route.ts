import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type WhatsAppStatus = 'sent' | 'delivered' | 'read' | 'failed'

function mapStatus(status?: string): { appStatus: 'SENT' | 'DELIVERED' | 'FAILED'; deliveredAt?: string } {
  const normalized = String(status || '').toLowerCase() as WhatsAppStatus

  if (normalized === 'delivered' || normalized === 'read') {
    return { appStatus: 'DELIVERED', deliveredAt: new Date().toISOString() }
  }

  if (normalized === 'failed') {
    return { appStatus: 'FAILED' }
  }

  return { appStatus: 'SENT' }
}

async function updateSmsStatusFromWebhook(payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []

    for (const change of changes) {
      const statuses = change?.value?.statuses
      if (!Array.isArray(statuses)) continue

      for (const statusEvent of statuses) {
        const providerMessageId = statusEvent?.id
        if (!providerMessageId) continue

        const mapped = mapStatus(statusEvent?.status)
        const errorMessage = Array.isArray(statusEvent?.errors) && statusEvent.errors.length > 0
          ? statusEvent.errors.map((e: any) => e?.title || e?.message || JSON.stringify(e)).join('; ')
          : null

        const updatePayload: Record<string, unknown> = {
          status: mapped.appStatus,
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        }

        if (mapped.deliveredAt) {
          updatePayload.delivered_at = mapped.deliveredAt
        }

        await supabaseAdmin
          .from('sms_notifications')
          .update(updatePayload)
          .eq('provider_message_id', providerMessageId)
      }
    }
  }
}

function unixToIso(ts?: string): string | null {
  if (!ts) return null
  const num = Number(ts)
  if (!Number.isFinite(num)) return null
  return new Date(num * 1000).toISOString()
}

function extractMessagePreview(message: any): string {
  const type = String(message?.type || '')

  if (type === 'text') return String(message?.text?.body || '')
  if (type === 'image') return message?.image?.caption ? String(message.image.caption) : '[Image]'
  if (type === 'video') return message?.video?.caption ? String(message.video.caption) : '[Video]'
  if (type === 'audio') return '[Audio]'
  if (type === 'document') return message?.document?.caption ? String(message.document.caption) : '[Document]'
  if (type === 'button') return String(message?.button?.text || '[Button]')
  if (type === 'interactive') return '[Interactive]'

  return `[${type || 'message'}]`
}

function getMediaDetails(message: any): { mediaId?: string; mimeType?: string; caption?: string } {
  const type = String(message?.type || '')
  const payload = message?.[type]
  if (!payload || typeof payload !== 'object') return {}

  return {
    mediaId: payload?.id,
    mimeType: payload?.mime_type,
    caption: payload?.caption,
  }
}

async function ensureConversation(params: {
  waId: string
  contactName?: string | null
  preview?: string | null
  messageAt?: string | null
  inbound?: boolean
}): Promise<string | null> {
  const { waId, contactName, preview, messageAt, inbound } = params

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('whatsapp_conversations' as any)
    .select('id, unread_count')
    .eq('wa_id', waId)
    .maybeSingle()

  if (existingError) {
    throw new Error(`Failed to load WhatsApp conversation: ${existingError.message}`)
  }

  if (existing?.id) {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (contactName) updatePayload.contact_name = contactName
    if (preview) updatePayload.last_message_text = preview
    if (messageAt) {
      updatePayload.last_message_at = messageAt
      if (inbound) {
        updatePayload.last_inbound_message_at = messageAt
        updatePayload.unread_count = Number(existing.unread_count || 0) + 1
      } else {
        updatePayload.last_outbound_message_at = messageAt
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('whatsapp_conversations' as any)
      .update(updatePayload)
      .eq('id', existing.id)

    if (updateError) {
      throw new Error(`Failed to update WhatsApp conversation: ${updateError.message}`)
    }

    return String(existing.id)
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from('whatsapp_conversations' as any)
    .insert({
      wa_id: waId,
      contact_name: contactName || null,
      last_message_text: preview || null,
      last_message_at: messageAt,
      last_inbound_message_at: inbound ? messageAt : null,
      last_outbound_message_at: inbound ? null : messageAt,
      unread_count: inbound ? 1 : 0,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (createError) {
    throw new Error(`Failed to create WhatsApp conversation: ${createError.message}`)
  }

  return created?.id ? String(created.id) : null
}

async function storeInboundMessages(payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []

    for (const change of changes) {
      const contacts = Array.isArray(change?.value?.contacts) ? change.value.contacts : []
      const messages = Array.isArray(change?.value?.messages) ? change.value.messages : []

      for (const message of messages) {
        const waId = String(message?.from || '')
        const messageId = String(message?.id || '')
        if (!waId || !messageId) continue

        const contact = contacts.find((c: any) => String(c?.wa_id || '') === waId)
        const contactName = contact?.profile?.name ? String(contact.profile.name) : null
        const preview = extractMessagePreview(message)
        const messageAt = unixToIso(message?.timestamp) || new Date().toISOString()
        const media = getMediaDetails(message)

        const conversationId = await ensureConversation({
          waId,
          contactName,
          preview,
          messageAt,
          inbound: true,
        })

        if (!conversationId) continue

        const { error: upsertError } = await supabaseAdmin
          .from('whatsapp_messages' as any)
          .upsert(
            {
              conversation_id: conversationId,
              wa_id: waId,
              message_id: messageId,
              direction: 'inbound',
              message_type: String(message?.type || 'unknown'),
              text_body: preview,
              media_id: media.mediaId || null,
              mime_type: media.mimeType || null,
              caption: media.caption || null,
              sent_at: messageAt,
              raw_payload: message,
              is_read: false,
            },
            { onConflict: 'message_id' }
          )

        if (upsertError) {
          throw new Error(`Failed to store inbound WhatsApp message: ${upsertError.message}`)
        }
      }
    }
  }
}

async function updateMessageStatusFromWebhook(payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : []

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : []

    for (const change of changes) {
      const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : []

      for (const statusEvent of statuses) {
        const providerMessageId = String(statusEvent?.id || '')
        if (!providerMessageId) continue

        const status = String(statusEvent?.status || '').toLowerCase()
        const updatePayload: Record<string, unknown> = {
          status,
          raw_payload: statusEvent,
        }

        const eventAt = unixToIso(statusEvent?.timestamp)
        if (status === 'sent' && eventAt) updatePayload.sent_at = eventAt
        if (status === 'delivered' && eventAt) updatePayload.delivered_at = eventAt
        if (status === 'read' && eventAt) {
          updatePayload.read_at = eventAt
          updatePayload.is_read = true
        }

        if (Array.isArray(statusEvent?.errors) && statusEvent.errors.length > 0) {
          updatePayload.error_message = statusEvent.errors
            .map((e: any) => e?.title || e?.message || JSON.stringify(e))
            .join('; ')
        }

        const { error: updateError } = await supabaseAdmin
          .from('whatsapp_messages' as any)
          .update(updatePayload)
          .eq('message_id', providerMessageId)

        if (updateError) {
          throw new Error(`Failed to update WhatsApp message status: ${updateError.message}`)
        }
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = (url.searchParams.get('hub.verify_token') || '').trim()
  const challenge = url.searchParams.get('hub.challenge')

  const verifyToken = (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '').trim()

  if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
    return new NextResponse(challenge || '', { status: 200 })
  }

  return NextResponse.json({ error: 'Webhook verification failed' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    await storeInboundMessages(body)
    await updateMessageStatusFromWebhook(body)
    await updateSmsStatusFromWebhook(body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[WHATSAPP_WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
