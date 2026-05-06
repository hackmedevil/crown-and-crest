// MSG91 SMS Provider Implementation

import { SendSMSResponse } from '../types'

interface MSG91Credentials {
  authKey?: string
  senderId?: string
  route?: string
}

/**
 * Send SMS via MSG91
 * Documentation: https://docs.msg91.com/p/tf9GTextN/e/H-qQr8KUh/MSG91
 */
export async function sendViaMSG91(
  phone: string,
  message: string,
  credentials: MSG91Credentials
): Promise<SendSMSResponse> {
  const { authKey, senderId, route } = credentials

  if (!authKey || !senderId) {
    throw new Error('MSG91 credentials not configured')
  }

  try {
    const response = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authkey': authKey,
      },
      body: JSON.stringify({
        sender: senderId,
        route: route || '4', // 4 = Transactional route
        country: '91',
        sms: [
          {
            message: message,
            to: [phone.replace('+', '')],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'MSG91 API error')
    }

    // MSG91 response format
    if (data.type === 'success') {
      return {
        success: true,
        messageId: data.request_id || data.message,
        status: 'SENT',
      }
    } else {
      throw new Error(data.message || 'SMS sending failed')
    }
  } catch (error) {
    console.error('[MSG91] Error sending SMS:', error)
    throw error
  }
}
