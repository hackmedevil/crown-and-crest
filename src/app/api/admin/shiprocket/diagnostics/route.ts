import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getShiprocketToken } from '@/lib/shiprocket/auth'

function maskEmail(value?: string | null) {
  if (!value) return null
  const [name, domain] = value.split('@')
  if (!domain) return `${name.slice(0, 2)}***`
  return `${name.slice(0, 2)}***@${domain}`
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const email = process.env.SHIPROCKET_EMAIL || null
    const password = process.env.SHIPROCKET_PASSWORD || null
    const webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET || null
    const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN || null

    const diagnostics: {
      configured: boolean
      email: string | null
      webhook_secret: boolean
      webhook_token: boolean
      api_test?: { status: string; error?: string }
      issues: string[]
    } = {
      configured: !!(email && password),
      email: maskEmail(email),
      webhook_secret: !!webhookSecret,
      webhook_token: !!webhookToken,
      issues: [],
    }

    if (!email) diagnostics.issues.push('SHIPROCKET_EMAIL is missing')
    if (!password) diagnostics.issues.push('SHIPROCKET_PASSWORD is missing')

    if (email && password) {
      try {
        await getShiprocketToken()
        diagnostics.api_test = { status: 'OK' }
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
