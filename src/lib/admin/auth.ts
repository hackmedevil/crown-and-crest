'use server'

import { getCurrentUser } from '@/lib/auth'

// Admin UID allowlist (matches layout.tsx)
const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || []

/**
 * Server-side admin authorization check
 * 
 * MUST be called at the start of every admin server action
 * Returns user UID if authorized, throws error if not
 */
export async function requireAdmin(): Promise<string> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized: Not authenticated')
  }
  
  if (!ADMIN_UIDS.includes(user.uid)) {
    throw new Error('Forbidden: Admin access required')
  }
  
  return user.uid
}

/**
 * Check if current user is admin (non-throwing version)
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin()
    return true
  } catch {
    return false
  }
}
