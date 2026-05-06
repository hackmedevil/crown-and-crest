// SMS Service - Provider-agnostic SMS sending
// Supports MSG91, Twilio, AWS SNS
// Main entry point for all SMS operations

'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  SMSProvider,
  SendSMSParams,
  SendSMSResponse,
  SMSStatus,
  NotificationType,
} from './types'
import { formatPhoneNumber, isValidPhoneNumber } from './templates'

// Provider implementations
import { sendViaMSG91 } from './providers/msg91'
import { sendViaTwilio } from './providers/twilio'
import { sendViaWhatsAppCloud } from './providers/whatsapp-cloud'
import { generateWhatsAppTemplate } from './whatsapp-templates'

/**
 * Get SMS provider configuration from environment
 */
function getSMSConfig() {
  const provider = (process.env.SMS_PROVIDER || 'msg91') as SMSProvider
  const enabled = process.env.SMS_ENABLED === 'true'
  const defaultCountryCode = process.env.SMS_DEFAULT_COUNTRY_CODE || '+91'

  return {
    provider,
    enabled,
    defaultCountryCode,
    credentials: {
      // MSG91
      authKey: process.env.MSG91_AUTH_KEY,
      senderId: process.env.MSG91_SENDER_ID,
      route: process.env.MSG91_ROUTE || '4',
      
      // Twilio
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      
      // AWS SNS
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'ap-south-1',

      // WhatsApp Cloud
      whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      whatsappBusinessId: process.env.WHATSAPP_BUSINESS_ID,
    },
  }
}

/**
 * Send SMS using configured provider
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResponse> {
  const config = getSMSConfig()

  // Check if SMS is enabled
  if (!config.enabled) {
    console.log('[SMS] SMS service is disabled')
    return {
      success: false,
      error: 'SMS service is disabled',
      status: 'FAILED',
    }
  }

  // Validate phone number
  if (!isValidPhoneNumber(params.phone)) {
    console.error('[SMS] Invalid phone number:', params.phone)
    return {
      success: false,
      error: 'Invalid phone number',
      status: 'FAILED',
    }
  }

  // Format phone number
  const formattedPhone = formatPhoneNumber(params.phone, config.defaultCountryCode)

  try {
    let response: SendSMSResponse

    // Send via appropriate provider
    switch (config.provider) {
      case 'msg91':
        response = await sendViaMSG91(formattedPhone, params.message, config.credentials)
        break

      case 'twilio':
        response = await sendViaTwilio(formattedPhone, params.message, config.credentials)
        break

      case 'whatsapp-cloud':
        // Generate WhatsApp template if notification type is provided
        const whatsappTemplate = params.notificationType && params.templateData
          ? generateWhatsAppTemplate(params.notificationType, params.templateData)
          : undefined

        response = await sendViaWhatsAppCloud(
          formattedPhone,
          params.message,
          {
            accessToken: config.credentials.whatsappAccessToken!,
            phoneNumberId: config.credentials.whatsappPhoneNumberId!,
            businessId: config.credentials.whatsappBusinessId,
          },
          whatsappTemplate
        )
        break

      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`)
    }

    // Log SMS to database if orderId is provided
    if (params.orderId && params.notificationType) {
      await logSMSToDatabase({
        orderId: params.orderId,
        phone: formattedPhone,
        notificationType: params.notificationType,
        message: params.message,
        templateId: params.templateId,
        messageId: response.messageId,
        status: response.status,
        error: response.error,
      })
    }

    console.log('[SMS] SMS sent successfully:', response.messageId)
    return response

  } catch (error) {
    console.error('[SMS] Error sending SMS:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed SMS to database
    if (params.orderId && params.notificationType) {
      await logSMSToDatabase({
        orderId: params.orderId,
        phone: formattedPhone,
        notificationType: params.notificationType,
        message: params.message,
        templateId: params.templateId,
        status: 'FAILED',
        error: errorMessage,
      })
    }

    return {
      success: false,
      error: errorMessage,
      status: 'FAILED',
    }
  }
}

/**
 * Log SMS to database
 */
async function logSMSToDatabase(params: {
  orderId: string
  phone: string
  notificationType: NotificationType
  message: string
  templateId?: string
  messageId?: string
  status: SMSStatus
  error?: string
}) {
  try {
    const { error } = await supabaseAdmin.from('sms_notifications').insert({
      order_id: params.orderId,
      phone: params.phone,
      notification_type: params.notificationType,
      message: params.message,
      template_id: params.templateId,
      provider_message_id: params.messageId,
      status: params.status,
      error_message: params.error,
      sent_at: params.status === 'SENT' || params.status === 'DELIVERED' ? new Date().toISOString() : null,
    })

    if (error) {
      // Check if it's duplicate prevention error
      if (error.message.includes('Duplicate SMS')) {
        console.log('[SMS] Duplicate SMS prevented:', params.orderId, params.notificationType)
      } else {
        console.error('[SMS] Error logging SMS to database:', error)
      }
    }
  } catch (error) {
    console.error('[SMS] Exception logging SMS:', error)
  }
}

/**
 * Get SMS history for an order
 */
export async function getSMSHistory(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('sms_notifications')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[SMS] Error fetching SMS history:', error)
    return []
  }

  return data || []
}

/**
 * Check if SMS was already sent for order and notification type
 */
export async function wasSMSSent(orderId: string, notificationType: NotificationType): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('sms_notifications')
    .select('id')
    .eq('order_id', orderId)
    .eq('notification_type', notificationType)
    .in('status', ['SENT', 'DELIVERED'])
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last 1 hour
    .limit(1)
    .single()

  return !!data
}
