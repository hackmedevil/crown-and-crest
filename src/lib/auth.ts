import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')

    if (!session?.value) return null

    // Verify signed session cookie
    const parts = session.value.split('.')
    if (parts.length !== 2) {
      console.error('Invalid session format')
      return null
    }

    const [payloadB64, signatureB64] = parts
    
    // Verify signature
    const secret = process.env.SESSION_SECRET
    if (!secret) {
      throw new Error('SESSION_SECRET environment variable is required for session security')
    }
    const payload = Buffer.from(payloadB64, 'base64').toString('utf-8')
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64')
    
    if (expectedSignature !== signatureB64) {
      console.error('Invalid session signature')
      return null
    }

    // Parse and validate payload
    let sessionData
    try {
      sessionData = JSON.parse(payload)
    } catch {
      console.error('Invalid session payload')
      return null
    }

    if (!sessionData.uid || !sessionData.iat) {
      console.error('Missing required session fields')
      return null
    }

    return {
      uid: sessionData.uid,
    }
  } catch (error) {
    console.error('Error reading current user:', error)
    return null
  }
}