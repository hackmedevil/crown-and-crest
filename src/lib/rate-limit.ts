/**
 * Rate Limiting Utility
 * 
 * Provides request rate limiting using Vercel Edge KV (production) or in-memory cache (development).
 * Implements token bucket algorithm for flexible rate control.
 * 
 * Usage:
 *   const { success, remaining } = await rateLimit('cart:add:uid123', RATE_LIMITS.CART_MUTATION)
 *   if (!success) return { error: 'Too many requests' }
 */


import { kv } from '@vercel/kv'

export type RateLimitConfig = {
  requests: number   // Maximum requests allowed
  window: number     // Time window in seconds
}

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt?: number  // Unix timestamp when limit resets
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Cart mutations (add, update, remove)
  CART_MUTATION: { requests: 100, window: 60 },
  
  // Order creation
  ORDER_CREATION: { requests: 10, window: 60 },
  
  // OTP send (stricter to prevent SMS spam)
  OTP_SEND: { requests: 3, window: 3600 }, // 3 per hour
  
  // Checkout mutations
  CHECKOUT: { requests: 20, window: 60 },
  
  // Guest/unauthenticated API access
  GUEST_API: { requests: 10, window: 60 },

  // Admin mutations (products, variants, collections, etc.)
  ADMIN_MUTATION: { requests: 20, window: 60 },

  // Admin bulk variant creation can legitimately burst above generic admin mutation limits.
  ADMIN_VARIANT_CREATE: { requests: 180, window: 60 },
} as const

// Development fallback: in-memory cache (cleared on server restart)
const devCache = new Map<string, { count: number; resetAt: number }>()

/**
 * Check if request is within rate limit
 * 
 * @param key - Unique identifier for the rate limit bucket (e.g., 'cart:add:uid123')
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and remaining requests
 */
export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const resetAt = now + (config.window * 1000)

  try {
    // Production: Use Vercel KV
    if (process.env.KV_REST_API_URL) {
      return await rateLimitKV(key, config, now, resetAt)
    }
    
    // Development: Use in-memory cache
    return rateLimitMemory(key, config, now, resetAt)
  } catch (error) {
    console.error('Rate limit check failed:', error)
    // Fail open (allow request) rather than fail closed (block legitimate users)
    return { success: true, remaining: config.requests }
  }
}

/**
 * Rate limit using Vercel KV (production)
 */
async function rateLimitKV(
  key: string,
  config: RateLimitConfig,
  now: number,
  resetAt: number
): Promise<RateLimitResult> {
  const kvKey =`ratelimit:${key}`
  
  // Get current count
  const current = await kv.get<number>(kvKey) || 0
  
  if (current >= config.requests) {
    // Limit exceeded
    const ttl = await kv.ttl(kvKey)
    return {
      success: false,
      remaining: 0,
      resetAt: now + (ttl * 1000)
    }
  }
  
  // Increment counter
  const newCount = current + 1
  
  // Set with expiry (only on first request in window)
  if (current === 0) {
    await kv.set(kvKey, newCount, { ex: config.window })
  } else {
    await kv.set(kvKey, newCount, { keepTtl: true })
  }
  
  return {
    success: true,
    remaining: config.requests - newCount,
    resetAt
  }
}

/**
 * Rate limit using in-memory cache (development only)
 */
function rateLimitMemory(
  key: string,
  config: RateLimitConfig,
  now: number,
  resetAt: number
): RateLimitResult {
  const cached = devCache.get(key)
  
  // Clean expired entries
  if (cached && cached.resetAt < now) {
    devCache.delete(key)
  }
  
  const current = (cached && cached.resetAt >= now) ? cached.count : 0
  
  if (current >= config.requests) {
    return {
      success: false,
      remaining: 0,
      resetAt: cached!.resetAt
    }
  }
  
  // Increment counter
  devCache.set(key, {
    count: current + 1,
    resetAt: cached?.resetAt || resetAt
  })
  
  return {
    success: true,
    remaining: config.requests - (current + 1),
    resetAt: cached?.resetAt || resetAt
  }
}

/**
 * Get rate limit key for a user
 */
export function getUserRateLimitKey(action: string, uid: string): string {
  return `${action}:${uid}`
}

/**
 * Get rate limit key for IP address
 */
export function getIPRateLimitKey(action: string, ip: string): string {
  return `${action}:ip:${ip}`
}
