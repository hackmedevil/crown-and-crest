import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// =============================================================
// Next.js Middleware — Route Protection & Security
// Runs on Edge Runtime for all matched routes
// =============================================================

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/account',
]

// Routes that require admin role
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin',
]

// Public routes that should skip auth checks entirely
const PUBLIC_ROUTES = [
  '/',
  '/shop',
  '/product',
  '/search',
  '/api/auth',
  '/api/products',
  '/api/search',
  '/api/shop',
  '/api/cron',
  '/api/razorpay/webhook',
  '/api/shiprocket/webhook',
  '/api/whatsapp/webhook',
  '/api/discovery',
  '/api/homepage',
  '/api/shipping/rates',
]

// Legacy auth paths to redirect
const LEGACY_AUTH_PATHS = ['/auth', '/login', '/signin']

// Rate limiting storage (in-memory, per-instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60_000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // per window

/**
 * Verify an HMAC-SHA256 signed session cookie using Web Crypto API (Edge-compatible)
 */
async function verifySession(sessionValue: string, secret: string): Promise<{ uid: string } | null> {
  try {
    const parts = sessionValue.split('.')
    if (parts.length !== 2) return null

    const [payloadB64, signatureB64] = parts

    // Import the secret key for HMAC
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    // Decode the payload
    const payload = atob(payloadB64)

    // Sign the payload with HMAC-SHA256
    const signatureArrayBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(payload)
    )

    // Convert to base64 for comparison
    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureArrayBuffer))
    )

    if (expectedSignature !== signatureB64) return null

    const sessionData = JSON.parse(payload)
    if (!sessionData.uid || !sessionData.iat) return null
    if (typeof sessionData.exp === 'number' && Date.now() > sessionData.exp) return null

    return { uid: sessionData.uid }
  } catch {
    return null
  }
}

/**
 * Simple rate limiting by IP
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX_REQUESTS
}

/**
 * Check if a path starts with any of the given prefixes
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => pathname === route || pathname.startsWith(route + '/'))
}

export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const response = NextResponse.next()

  // ── Security Headers ──
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // ── Legacy Auth Paths Redirect ──
  if (matchesRoute(pathname, LEGACY_AUTH_PATHS)) {
    const url = new URL('/', request.url)
    return NextResponse.redirect(url)
  }

  // ── Rate Limiting (API routes only) ──
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown'
    
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // ── Skip public routes ──
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return response
  }

  // ── Static assets & Next.js internals — skip ──
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Static files like .css, .js, .png
  ) {
    return response
  }

  // ── Protected & Admin Routes — require auth ──
  const isProtected = matchesRoute(pathname, PROTECTED_ROUTES)
  const isAdmin = matchesRoute(pathname, ADMIN_ROUTES)

  if (isProtected || isAdmin) {
    const sessionCookie = request.cookies.get('session')?.value
    const secret = process.env.SESSION_SECRET

    if (!sessionCookie || !secret) {
      // No session — redirect to login for pages, 401 for APIs
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/', request.url)
      const redirectTarget = `${pathname}${search}`
      loginUrl.searchParams.set('openAuth', '1')
      loginUrl.searchParams.set('redirect', redirectTarget)
      return NextResponse.redirect(loginUrl)
    }

    const user = await verifySession(sessionCookie, secret)
    if (!user) {
      // Invalid session — clear cookie and redirect
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      const loginUrl = new URL('/', request.url)
      const redirectTarget = `${pathname}${search}`
      loginUrl.searchParams.set('openAuth', '1')
      loginUrl.searchParams.set('redirect', redirectTarget)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.cookies.delete('session')
      return redirectResponse
    }

    // Pass user UID to downstream handlers via header
    response.headers.set('x-user-uid', user.uid)

    // Admin routes need additional role check
    // Note: Full admin role verification happens in the API route handlers
    // via service_role Supabase client. The middleware provides a first gate.
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)  
     * - favicon.ico (favicon)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
}
