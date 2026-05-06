/**
 * SMS Diagnostics Endpoint
 * Checks WhatsApp/SMS configuration and credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // 1. Verify admin authorization
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // 2. Check SMS configuration
    const smsEnabled = process.env.SMS_ENABLED === 'true'
    const smsProvider = process.env.SMS_PROVIDER || 'not-configured'
    const countryCode = process.env.SMS_DEFAULT_COUNTRY_CODE || '+91'

    const diagnostics: any = {
      sms_enabled: smsEnabled,
      provider: smsProvider,
      country_code: countryCode,
      provider_configs: {},
      issues: [],
      warnings: [],
    }

    // 3. Check provider-specific configs
    if (smsProvider === 'msg91') {
      diagnostics.provider_configs.msg91 = {
        auth_key: process.env.MSG91_AUTH_KEY ? '✅ Configured' : '❌ Missing',
        sender_id: process.env.MSG91_SENDER_ID ? '✅ Configured' : '❌ Missing',
        route: process.env.MSG91_ROUTE ? '✅ Configured' : '❌ Missing (default: 4)',
      }

      if (!process.env.MSG91_AUTH_KEY) diagnostics.issues.push('MSG91_AUTH_KEY not configured')
      if (!process.env.MSG91_SENDER_ID) diagnostics.issues.push('MSG91_SENDER_ID not configured')
    }

    if (smsProvider === 'twilio') {
      diagnostics.provider_configs.twilio = {
        account_sid: process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Missing',
        auth_token: process.env.TWILIO_AUTH_TOKEN ? '✅ Configured' : '❌ Missing',
        phone_number: process.env.TWILIO_PHONE_NUMBER ? '✅ Configured' : '❌ Missing',
      }

      if (!process.env.TWILIO_ACCOUNT_SID) diagnostics.issues.push('TWILIO_ACCOUNT_SID not configured')
      if (!process.env.TWILIO_AUTH_TOKEN) diagnostics.issues.push('TWILIO_AUTH_TOKEN not configured')
      if (!process.env.TWILIO_PHONE_NUMBER) diagnostics.issues.push('TWILIO_PHONE_NUMBER not configured')
    }

    if (smsProvider === 'whatsapp-cloud') {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
      const businessId = process.env.WHATSAPP_BUSINESS_ID

      diagnostics.provider_configs.whatsapp_cloud = {
        access_token: accessToken ? `✅ Configured (${accessToken.substring(0, 10)}...)` : '❌ Missing',
        phone_number_id: phoneNumberId ? `✅ Configured (${phoneNumberId})` : '❌ Missing',
        business_id: businessId ? `✅ Configured (${businessId})` : '⚠️ Optional',
      }

      if (!accessToken) {
        diagnostics.issues.push('WHATSAPP_ACCESS_TOKEN not configured')
      } else {
        // Test WhatsApp API connection
        try {
          const testResponse = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}?fields=status,quality_rating&access_token=${accessToken}`,
            { method: 'GET' }
          )

          const testData = await testResponse.json()

          if (testResponse.ok) {
            diagnostics.whatsapp_api_test = {
              status: '✅ API Connection OK',
              phone_status: testData.status || 'unknown',
              quality_rating: testData.quality_rating || 'not_available',
            }
          } else {
            diagnostics.issues.push(`WhatsApp API Error: ${testData.error?.message || 'Unknown'}`)
            diagnostics.whatsapp_api_test = {
              status: '❌ API Connection Failed',
              error: testData.error?.message || 'Unknown error',
            }
          }
        } catch (error) {
          diagnostics.warnings.push('Could not test WhatsApp API connection')
        }
      }

      if (!phoneNumberId) diagnostics.issues.push('WHATSAPP_PHONE_NUMBER_ID not configured')

      // Check required templates
      diagnostics.required_templates = [
        'order_created',
        'payment_confirmed',
        'order_shipped',
        'out_for_delivery',
        'order_delivered',
        'cancelled',
      ]
    }

    // 4. Overall health check
    if (!smsEnabled) {
      diagnostics.issues.push('SMS service is disabled (SMS_ENABLED != "true")')
    }

    if (!smsProvider || smsProvider === 'not-configured') {
      diagnostics.issues.push('SMS_PROVIDER not configured')
    }

    diagnostics.health_status = diagnostics.issues.length === 0 ? '✅ OK' : '❌ Issues Found'

    return NextResponse.json(diagnostics)
  } catch (error) {
    console.error('[SMS_DIAGNOSTICS] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
