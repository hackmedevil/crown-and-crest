import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { supabaseAdmin } from '@/lib/supabase/admin'
import crypto from 'crypto'
export const dynamic = 'force-dynamic'


const SESSION_EXPIRY_DAYS = 7
const SESSION_EXPIRY_SECONDS = SESSION_EXPIRY_DAYS * 24 * 60 * 60

// Session signing helpers
function signSession(uid: string): string {
  const payload = JSON.stringify({
    uid,
    iat: Date.now()
  })
  
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required for session security')
  }
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64')
  
  const sessionValue = `${Buffer.from(payload).toString('base64')}.${signature}`
  return sessionValue
}

export async function POST(req: Request) {
  try {
    const { idToken, provider, displayName, email } = await req.json()

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'Missing ID token' }), {
        status: 400,
      })
    }

    // Verify Firebase ID token server-side
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken)
    } catch (error) {
      console.error('Token verification failed:', error)
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
      })
    }

    const uid = decodedToken.uid

    // Verify user exists in database, or create if new signup
    let user
    const { data: existingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('firebase_uid')
      .eq('firebase_uid', uid)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // User not found - create new user for first-time signups
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          firebase_uid: uid,
          role: 'customer',
          // For social logins, store provider and profile info
          ...(provider && {
            auth_provider: provider,
            auth_provider_uid: decodedToken.firebase?.identities?.[0] || uid,
          }),
          ...(displayName && { full_name: displayName }),
          ...(email && { email }),
        })
        .select()
        .single()

      if (createError) {
        console.error('User creation failed:', createError)
        return new Response(JSON.stringify({ error: 'Failed to create user record' }), {
          status: 500,
        })
      }
      user = newUser
    } else if (userError || !existingUser) {
      console.error('User lookup failed:', userError)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      })
    } else {
      user = existingUser
      
      // For social logins on existing accounts, update auth provider if different
      if (provider) {
        await supabaseAdmin
          .from('users')
          .update({
            auth_provider: provider,
          })
          .eq('firebase_uid', uid)
          .select()
      }
    }

    // Create signed session cookie
    const cookieStore = await cookies()
    const signedSession = signSession(uid)

    cookieStore.set('session', signedSession, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_EXPIRY_SECONDS,
    })

    return new Response(JSON.stringify({ success: true }))
  } catch (error) {
    console.error('Session creation error:', error)
    return new Response(JSON.stringify({ error: 'Session creation failed' }), {
      status: 500,
    })
  }
}