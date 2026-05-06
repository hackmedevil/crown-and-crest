import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function maskKey(value?: string | null) {
  if (!value) return null
  if (value.length <= 6) return `${value.slice(0, 2)}***${value.slice(-1)}`
  return `${value.slice(0, 6)}***${value.slice(-4)}`
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids =
      process.env.ADMIN_UIDS?.split(',').map((uid) => uid.trim()).filter(Boolean) || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const keyId = process.env.RAZORPAY_KEY_ID || null
    const keySecret = process.env.RAZORPAY_KEY_SECRET || null
    const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || null

    const diagnostics: {
      configured: boolean
      key_id: string | null
      public_key_id: string | null
      webhook_secret: boolean
      api_test?: { status: string; error?: string }
      issues: string[]
    } = {
      configured: !!(keyId && keySecret),
      key_id: maskKey(keyId),
      public_key_id: maskKey(publicKeyId),
      webhook_secret: !!webhookSecret,
      issues: [],
    }

    if (!keyId) diagnostics.issues.push('RAZORPAY_KEY_ID is missing')
    if (!keySecret) diagnostics.issues.push('RAZORPAY_KEY_SECRET is missing')
    if (!publicKeyId) diagnostics.issues.push('NEXT_PUBLIC_RAZORPAY_KEY_ID is missing')
    if (!webhookSecret) diagnostics.issues.push('RAZORPAY_WEBHOOK_SECRET is missing')

    if (keyId && keySecret) {
      try {
        const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'),
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          const errorText = await response.text()
          diagnostics.api_test = {
            status: 'FAILED',
            error: errorText || `HTTP ${response.status}`,
          }
        } else {
          diagnostics.api_test = { status: 'OK' }
        }
      } catch (error) {
        diagnostics.api_test = {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    return NextResponse.json(diagnostics)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
