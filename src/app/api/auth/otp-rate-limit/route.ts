import { NextRequest, NextResponse } from 'next/server'

type AttemptStore = Map<string, number[]>

const WINDOW_MS = 60_000
const MAX_PHONE_ATTEMPTS = 3
const MAX_IP_ATTEMPTS = 5

function getStores() {
  const globalScope = globalThis as typeof globalThis & {
    __otpPhoneAttempts?: AttemptStore
    __otpIpAttempts?: AttemptStore
  }

  if (!globalScope.__otpPhoneAttempts) {
    globalScope.__otpPhoneAttempts = new Map()
  }

  if (!globalScope.__otpIpAttempts) {
    globalScope.__otpIpAttempts = new Map()
  }

  return {
    phoneAttempts: globalScope.__otpPhoneAttempts,
    ipAttempts: globalScope.__otpIpAttempts,
  }
}

function extractIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim()
  }

  const xRealIp = req.headers.get('x-real-ip')
  if (xRealIp) return xRealIp

  const cfConnectingIp = req.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp

  return 'unknown'
}

function pruneAttempts(attempts: number[], now: number): number[] {
  return attempts.filter(ts => now - ts < WINDOW_MS)
}

function checkAndTrack(store: AttemptStore, key: string, maxAttempts: number, now: number): { ok: boolean; retryAfterSeconds?: number } {
  const existing = pruneAttempts(store.get(key) ?? [], now)

  if (existing.length >= maxAttempts) {
    const oldest = existing[0]
    const retryAfterMs = Math.max(WINDOW_MS - (now - oldest), 1000)
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    }
  }

  existing.push(now)
  store.set(key, existing)
  return { ok: true }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { phone?: string }
    const phone = body.phone?.trim()

    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    const now = Date.now()
    const ip = extractIp(req)
    const { phoneAttempts, ipAttempts } = getStores()

    const phoneCheck = checkAndTrack(phoneAttempts, phone, MAX_PHONE_ATTEMPTS, now)
    if (!phoneCheck.ok) {
      return NextResponse.json(
        {
          error: `Too many OTP requests for this phone. Try again in ${phoneCheck.retryAfterSeconds}s.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(phoneCheck.retryAfterSeconds ?? 60),
          },
        }
      )
    }

    const ipCheck = checkAndTrack(ipAttempts, ip, MAX_IP_ATTEMPTS, now)
    if (!ipCheck.ok) {
      return NextResponse.json(
        {
          error: `Too many OTP requests from your network. Try again in ${ipCheck.retryAfterSeconds}s.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipCheck.retryAfterSeconds ?? 60),
          },
        }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }
}
