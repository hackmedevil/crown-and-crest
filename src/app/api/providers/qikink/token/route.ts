// POST /api/providers/qikink/token
// Admin-only proxy to generate a fresh Qikink access token.
// Useful for debugging and manual verification of credentials.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchQikinkToken } from '@/lib/qikink/client'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const adminUids = process.env.ADMIN_UIDS?.split(',') ?? []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clientId = process.env.QIKINK_CLIENT_ID
    const clientSecret = process.env.QIKINK_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'QIKINK_CLIENT_ID and QIKINK_CLIENT_SECRET are not configured' },
        { status: 503 }
      )
    }

    // Allow optional credential override from request body (for connection testing)
    let resolvedClientId = clientId
    let resolvedClientSecret = clientSecret

    const body = await req.json().catch(() => ({}))
    if (typeof body.client_id === 'string' && body.client_id.trim()) {
      resolvedClientId = body.client_id.trim()
    }
    if (typeof body.client_secret === 'string' && body.client_secret.trim()) {
      resolvedClientSecret = body.client_secret.trim()
    }

    const tokenData = await fetchQikinkToken(resolvedClientId, resolvedClientSecret)

    return NextResponse.json({
      ClientId: tokenData.ClientId,
      Accesstoken: tokenData.Accesstoken,
      expires_in: tokenData.expires_in,
    })
  } catch (error) {
    console.error('[QIKINK_TOKEN]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Token generation failed' },
      { status: 502 }
    )
  }
}
