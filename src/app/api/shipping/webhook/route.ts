import { NextRequest, NextResponse } from 'next/server'
import { POST as shiprocketWebhook } from '@/app/api/shiprocket/webhook/route'

export async function GET() {
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const tokenHeader = req.headers.get('x-api-key')
  const webhookToken = process.env.SHIPROCKET_WEBHOOK_TOKEN
  if (webhookToken && tokenHeader !== webhookToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  return shiprocketWebhook(req)
}
