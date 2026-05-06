/**
 * CSRF Protection Utilities
 * Provides CSRF token generation, verification, and middleware
 */

import { cookies } from 'next/headers';
import { createHmac, randomBytes } from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CSRFToken {
  token: string;
  timestamp: number;
}

/**
 * Generate a new CSRF token
 * @returns Object with token and expiration timestamp
 */
export function generateCSRFToken(): { token: string; expiresAt: number } {
  const secret = getCSRFSecret();
  const randomToken = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now();

  // Create signed token: randomToken + timestamp + signature
  const signature = createHmac('sha256', secret)
    .update(`${randomToken}:${timestamp}`)
    .digest('hex');

  const token = `${randomToken}:${timestamp}:${signature}`;
  const expiresAt = timestamp + CSRF_TOKEN_TTL;

  return { token, expiresAt };
}

/**
 * Verify CSRF token validity
 * @param token CSRF token to verify
 * @returns True if token is valid and not expired
 */
export function verifyCSRFToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split(':');
  if (parts.length !== 3) {
    return false;
  }

  const [randomToken, timestampStr, providedSignature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  // Check if timestamp is valid
  if (isNaN(timestamp)) {
    return false;
  }

  // Check if token is expired
  const now = Date.now();
  if (now - timestamp > CSRF_TOKEN_TTL) {
    return false;
  }

  // Verify signature
  const secret = getCSRFSecret();
  const expectedSignature = createHmac('sha256', secret)
    .update(`${randomToken}:${timestamp}`)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (providedSignature.length !== expectedSignature.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < providedSignature.length; i++) {
    mismatch |= providedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * Set CSRF token as httpOnly cookie
 * @param token CSRF token to store
 * @param expiresAt Expiration timestamp
 */
export async function setCSRFCookie(token: string, expiresAt: number): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(expiresAt),
  });
}

/**
 * Get CSRF token from cookie
 * @returns CSRF token or null if not found
 */
export async function getCSRFCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);
  return cookie?.value || null;
}

/**
 * Get CSRF token from request header
 * @param headers Request headers
 * @returns CSRF token or null if not found
 */
export function getCSRFHeader(headers: Headers): string | null {
  return headers.get(CSRF_HEADER_NAME) || headers.get(CSRF_HEADER_NAME.toUpperCase());
}

/**
 * Middleware: Require valid CSRF token
 * Checks both cookie and header, validates they match
 * @param headers Request headers
 * @throws Error if CSRF validation fails
 */
export async function requireCSRFToken(headers: Headers): Promise<void> {
  // Get token from cookie
  const cookieToken = await getCSRFCookie();
  if (!cookieToken) {
    throw new Error('CSRF token not found in cookie');
  }

  // Get token from header
  const headerToken = getCSRFHeader(headers);
  if (!headerToken) {
    throw new Error('CSRF token not found in header');
  }

  // Verify tokens match (double-submit cookie pattern)
  if (cookieToken !== headerToken) {
    throw new Error('CSRF token mismatch');
  }

  // Verify token is valid
  if (!verifyCSRFToken(cookieToken)) {
    throw new Error('CSRF token is invalid or expired');
  }
}

/**
 * Get CSRF secret from environment
 * @throws Error if CSRF_SECRET is not configured
 */
function getCSRFSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (secret) {
    if (secret.length < 32) {
      throw new Error('CSRF_SECRET must be at least 32 characters long');
    }
    return secret;
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret && sessionSecret.length >= 32) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[CSRF] CSRF_SECRET missing in production; using SESSION_SECRET fallback.');
    } else {
      console.warn('[CSRF] CSRF_SECRET missing; using SESSION_SECRET fallback for development.');
    }
    return sessionSecret;
  }

  if (process.env.NODE_ENV !== 'production') {
    const devSeed = `${process.cwd()}:${process.env.NEXT_PUBLIC_SUPABASE_URL || 'local'}`;
    const derivedSecret = createHmac('sha256', 'crown-and-crest-dev-csrf')
      .update(devSeed)
      .digest('hex');
    console.warn('[CSRF] CSRF_SECRET missing; using derived development fallback secret.');
    return derivedSecret;
  }

  throw new Error('CSRF_SECRET environment variable is not configured');
}

/**
 * Generate a new CSRF token and set it as cookie
 * Convenience function for API routes
 * @returns The generated token (to return in response body)
 */
export async function issueCSRFToken(): Promise<string> {
  const { token, expiresAt } = generateCSRFToken();
  await setCSRFCookie(token, expiresAt);
  return token;
}
