// Server-only Cloudinary configuration and helpers
// DO NOT import this in client components or expose secrets to the browser

import { v2 as cloudinary } from 'cloudinary'
import crypto from 'crypto'

// Environment variables (server-only)
const CLOUDINARY_CLOUD_NAME = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '').trim()
const CLOUDINARY_API_KEY = (process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY || '').trim()
const CLOUDINARY_API_SECRET = (process.env.CLOUDINARY_API_SECRET || '').trim() // NEVER expose to client

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn(
    'Cloudinary credentials are missing. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
  )
}

// Configure Cloudinary SDK (v2)
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
})

console.log('Cloudinary Config Loaded:', {
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY ? '***' + CLOUDINARY_API_KEY.slice(-4) : 'MISSING',
    api_secret: CLOUDINARY_API_SECRET ? '***' + CLOUDINARY_API_SECRET.slice(-4) : 'MISSING'
})

/**
 * Get Cloudinary config for signature generation and API calls.
 * Only use on the server. NEVER send api_secret to client.
 */
export function getCloudinaryConfig() {
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
  }
}

/**
 * Get the configured Cloudinary v2 instance for admin operations.
 * Use for upload signature generation, asset deletion, etc.
 */
export function getCloudinaryAdmin() {
  return cloudinary
}

/**
 * Generate HMAC-SHA1 signature for Cloudinary signed uploads.
 * Params must be sorted alphabetically and formatted as `key1=value1&key2=value2...`
 * @param params - Object with upload parameters (timestamp, folder, public_id, etc.)
 * @returns Signature string
 */
export function generateCloudinarySignature(params: Record<string, string | number>): string {
  const config = getCloudinaryConfig()
  if (!config.apiSecret) {
    throw new Error('CLOUDINARY_API_SECRET is not configured')
  }

  // Sort params alphabetically and build query string (exclude api_key, resource_type, and file)
  const sortedParams = Object.keys(params)
    .filter((key) => key !== 'api_key' && key !== 'resource_type' && key !== 'file')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  // Generate HMAC-SHA1 signature
  const signature = crypto
    .createHmac('sha1', config.apiSecret)
    .update(sortedParams)
    .digest('hex')

  return signature
}

/**
 * Delete an asset from Cloudinary by public_id.
 * @param publicId - Cloudinary public_id
 * @param resourceType - 'image' or 'video'
 * @returns Promise with result
 */
export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: 'image' | 'video' = 'image'
): Promise<{ ok: boolean; result?: string }> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true, // Invalidate CDN cache
    })

    if (result.result === 'ok' || result.result === 'not found') {
      return { ok: true, result: result.result }
    }

    return { ok: false, result: result.result }
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    return { ok: false }
  }
}

// FUTURE: Add transformation helpers here when needed
// FUTURE: Add upload preset helpers
// FUTURE: Add CDN URL builders with transformation strings
