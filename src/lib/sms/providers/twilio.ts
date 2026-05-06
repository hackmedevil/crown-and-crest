// Twilio SMS Provider Implementation

import { SendSMSResponse } from '../types'

interface TwilioCredentials {
  accountSid?: string
  authToken?: string
  phoneNumber?: string
}

/**
 * Send SMS via Twilio
 * Documentation: https://www.twilio.com/docs/sms/api
 */
export async function sendViaTwilio(
  phone: string,
  message: string,
  credentials: TwilioCredentials
): Promise<SendSMSResponse> {
  const { accountSid, authToken, phoneNumber } = credentials

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Twilio credentials not configured')
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({
        To: phone,
        From: phoneNumber,
        Body: message,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Twilio API error')
    }

    // Twilio response format
    if (data.sid) {
      return {
        success: true,
        messageId: data.sid,
        status: data.status === 'queued' || data.status === 'sent' ? 'SENT' : 'PENDING',
      }
    } else {
      throw new Error('Invalid Twilio response')
    }
  } catch (error) {
    console.error('[TWILIO] Error sending SMS:', error)
    throw error
  }
}
