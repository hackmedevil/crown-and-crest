/**
 * WhatsApp Test Endpoint
 * For debugging message sending without templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

function isMetaTokenExpired(error: any): boolean {
  const code = Number(error?.code || 0)
  const message = String(error?.message || '').toLowerCase()
  return code === 190 || message.includes('session has expired') || message.includes('error validating access token')
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { phone, message, mode = 'template' } = await req.json()

    if (!phone || !message) {
      return NextResponse.json({ error: 'Missing phone or message' }, { status: 400 })
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'WhatsApp credentials missing' }, { status: 500 })
    }

    // Format phone (remove everything except digits)
    const formattedPhone = phone.replace(/[^0-9]/g, '')

    console.log('[WHATSAPP_TEST] Sending to:', formattedPhone)
    console.log('[WHATSAPP_TEST] Message:', message)

    const requestBody = mode === 'text'
      ? {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        }
      : {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US',
            },
          },
        }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    const data = await response.json()

    console.log('[WHATSAPP_TEST] Response:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      const tokenExpired = isMetaTokenExpired(data?.error)
      return NextResponse.json(
        {
          success: false,
          error: tokenExpired
            ? 'WhatsApp access token expired. Update WHATSAPP_ACCESS_TOKEN with a permanent Meta system-user token.'
            : data.error?.message || 'Failed to send message',
          actionRequired: tokenExpired
            ? 'Regenerate Meta token and redeploy with updated WHATSAPP_ACCESS_TOKEN.'
            : undefined,
          details: data.error,
        },
        { status: tokenExpired ? 401 : response.status }
      )
    }

    return NextResponse.json({
      success: true,
      message_id: data.messages?.[0]?.id,
      message: mode === 'text'
        ? 'Text message sent successfully!'
        : 'Template message sent successfully!',
      mode,
    })
  } catch (error) {
    console.error('[WHATSAPP_TEST] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
