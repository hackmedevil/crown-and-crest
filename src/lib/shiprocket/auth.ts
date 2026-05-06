// Shiprocket Authentication Module
// Server-side only token management with in-memory caching

import { CachedToken, ShiprocketAuthResponse } from './types'

const SHIPROCKET_API_URL = 'https://apiv2.shiprocket.in/v1'
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000 // Refresh 5 minutes before expiry

// In-memory token cache (server-side only)
let tokenCache: CachedToken | null = null

/**
 * Get valid Shiprocket auth token
 * Uses cached token if valid, otherwise generates new one
 */
export async function getShiprocketToken(): Promise<string> {
  // Check if cached token is still valid
  if (tokenCache && Date.now() < tokenCache.expiresAt - TOKEN_EXPIRY_BUFFER) {
    console.log('[SHIPROCKET_AUTH] Using cached token')
    return tokenCache.token
  }

  console.log('[SHIPROCKET_AUTH] Generating new token')
  const newToken = await generateToken()
  
  // Cache token for 24 hours (Shiprocket tokens typically expire in 10 days)
  tokenCache = {
    token: newToken,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }

  return newToken
}

/**
 * Generate new Shiprocket auth token via email/password
 */
async function generateToken(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD

  if (!email || !password) {
    throw new Error('SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be set in environment variables')
  }

  try {
    const response = await fetch(`${SHIPROCKET_API_URL}/external/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[SHIPROCKET_AUTH] Login failed:', response.status, errorText)
      throw new Error(`Shiprocket authentication failed: ${response.status}`)
    }

    const data: ShiprocketAuthResponse = await response.json()
    
    if (!data.token) {
      throw new Error('No token received from Shiprocket')
    }

    console.log('[SHIPROCKET_AUTH] Token generated successfully for:', data.email)
    return data.token

  } catch (error) {
    console.error('[SHIPROCKET_AUTH] Error generating token:', error)
    throw error
  }
}

/**
 * Clear cached token (useful for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null
  console.log('[SHIPROCKET_AUTH] Token cache cleared')
}
