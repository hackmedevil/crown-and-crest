/**
 * WhatsApp Cloud API Provider
 * Official Meta WhatsApp Business API
 * 
 * Features:
 * - Free (1000 conversations/month)
 * - Rich media support
 * - Template messages
 * - Delivery receipts
 */

import { SendSMSResponse } from '../types'

export interface WhatsAppCloudCredentials {
  accessToken: string
  phoneNumberId: string
  businessId?: string
}

export interface WhatsAppTemplateComponent {
  type: 'body' | 'header' | 'button'
  parameters: Array<{
    type: 'text' | 'image' | 'document'
    text?: string
    image?: { link: string }
    document?: { link: string; filename: string }
  }>
}

export interface WhatsAppTemplateMessage {
  name: string
  languageCode: string
  components?: WhatsAppTemplateComponent[]
}

type MetaApiError = {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
  fbtrace_id?: string
}

function isMetaAccessTokenExpired(error?: MetaApiError): boolean {
  if (!error) return false
  const code = Number(error.code || 0)
  const message = String(error.message || '').toLowerCase()
  return code === 190 || message.includes('session has expired') || message.includes('error validating access token')
}

function getMetaApiErrorMessage(error?: MetaApiError): string {
  if (isMetaAccessTokenExpired(error)) {
    return 'WhatsApp access token expired. Generate a new permanent Meta system-user token and update WHATSAPP_ACCESS_TOKEN.'
  }

  return error?.message || 'WhatsApp API error'
}

/**
 * Send WhatsApp message using Cloud API
 */
export async function sendViaWhatsAppCloud(
  phone: string,
  message: string,
  credentials: WhatsAppCloudCredentials,
  templateData?: WhatsAppTemplateMessage
): Promise<SendSMSResponse> {
  const { accessToken, phoneNumberId } = credentials

  if (!accessToken || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API credentials not configured')
  }

  // Format phone number (remove + and spaces)
  const formattedPhone = phone.replace(/[^0-9]/g, '')

  const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`

  try {
    let requestBody: any

    if (templateData) {
      // Send template message
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateData.name,
          language: {
            code: templateData.languageCode,
          },
          ...(templateData.components && { components: templateData.components }),
        },
      }
    } else {
      // Send text message (only works in development mode or after 24h window)
      requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      }
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = getMetaApiErrorMessage(data?.error)
      throw new Error(errorMessage)
    }

    // WhatsApp Cloud API response format
    return {
      success: true,
      messageId: data.messages?.[0]?.id || 'unknown',
      status: 'SENT',
    }
  } catch (error) {
    console.error('[WHATSAPP_CLOUD] Error sending message:', error)
    throw error
  }
}

/**
 * Create WhatsApp template
 */
export async function createWhatsAppTemplate(
  credentials: WhatsAppCloudCredentials,
  template: {
    name: string
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
    language: string
    components: any[]
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const { accessToken, businessId } = credentials

  if (!accessToken || !businessId) {
    throw new Error('Business ID required to create templates')
  }

  const apiUrl = `https://graph.facebook.com/v18.0/${businessId}/message_templates`

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(template),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to create template',
      }
    }

    return {
      success: true,
      id: data.id,
    }
  } catch (error) {
    console.error('[WHATSAPP_CLOUD] Error creating template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get template status
 */
export async function getTemplateStatus(
  credentials: WhatsAppCloudCredentials,
  templateName: string
): Promise<{ status: string; quality?: string }> {
  const { accessToken, businessId } = credentials

  if (!accessToken || !businessId) {
    throw new Error('Business ID required')
  }

  const apiUrl = `https://graph.facebook.com/v18.0/${businessId}/message_templates?name=${templateName}`

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const data = await response.json()

    if (data.data && data.data.length > 0) {
      return {
        status: data.data[0].status,
        quality: data.data[0].quality_score?.score,
      }
    }

    return { status: 'NOT_FOUND' }
  } catch (error) {
    console.error('[WHATSAPP_CLOUD] Error getting template status:', error)
    return { status: 'ERROR' }
  }
}
