'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { revalidatePath } from 'next/cache'

/**
 * AI Notification System
 * Manages real-time notifications for AI events
 */

export interface AINotification {
  id: string
  type: 'model_deleted' | 'rate_limit' | 'failover' | 'health_check_failed' | 'info'
  severity: 'info' | 'warning' | 'error' | 'critical'
  provider_id?: string
  model_id?: string
  message: string
  details?: Record<string, any>
  is_read: boolean
  created_at: string
  expires_at?: string
}

/**
 * Get unread notifications for admin
 * Returns empty notifications if fetch fails (graceful degradation)
 */
export async function getUnreadNotifications(): Promise<{
  notifications: AINotification[]
  count: number
}> {
  try {
    await requireAdmin()
  } catch {
    // If admin check fails, return empty notifications silently
    return { notifications: [], count: 0 }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ai_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      // Silently fail - return empty notifications instead of logging errors
      // This prevents noisy console errors when Supabase is unavailable
      return { notifications: [], count: 0 }
    }

    return {
      notifications: data || [],
      count: data?.length || 0
    }
  } catch {
    // Silently fail on any fetch/network errors
    // Notifications are non-critical, so we return empty list
    return { notifications: [], count: 0 }
  }
}

/**
 * Get all notifications (read and unread)
 */
export async function getAllNotifications(limit = 100): Promise<AINotification[]> {
  await requireAdmin()

  const { data } = await supabaseAdmin
    .from('ai_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(id: string): Promise<void> {
  await requireAdmin()

  await supabaseAdmin
    .from('ai_notifications')
    .update({ is_read: true })
    .eq('id', id)
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<void> {
  await requireAdmin()

  await supabaseAdmin
    .from('ai_notifications')
    .update({ is_read: true })
    .eq('is_read', false)

  revalidatePath('/admin')
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
  await requireAdmin()

  await supabaseAdmin
    .from('ai_notifications')
    .delete()
    .eq('id', id)
}

/**
 * Create a new notification
 */
export async function createNotification(
  notification: Omit<AINotification, 'id' | 'created_at' | 'is_read' | 'expires_at'>
): Promise<void> {
  console.log('[Notification] Creating:', notification.type, notification.message)

  const expiresAt = getExpiryDate(notification.type)

  const { error } = await supabaseAdmin
    .from('ai_notifications')
    .insert({
      ...notification,
      is_read: false,
      expires_at: expiresAt
    })

  if (error) {
    console.error('[Notification] Error creating:', error)
  }
}

/**
 * Clean up expired notifications
 */
export async function cleanupExpiredNotifications(): Promise<void> {
  await supabaseAdmin
    .from('ai_notifications')
    .delete()
    .lt('expires_at', new Date().toISOString())

  console.log('[Notifications] Cleaned up expired notifications')
}

/**
 * Get expiry date based on notification type
 */
function getExpiryDate(type: AINotification['type']): string {
  const now = new Date()
  
  switch (type) {
    case 'info':
      // Info notifications expire after 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    
    case 'rate_limit':
    case 'failover':
      // Rate limit/failover expire after 24 hours
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    
    case 'model_deleted':
    case 'health_check_failed':
      // Important notifications expire after 30 days
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    
    default:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }
}

/**
 * Log AI usage for analytics
 */
export async function logAIUsage(
  provider: string,
  modelId: string,
  success: boolean,
  errorType?: string,
  latencyMs?: number,
  tokensUsed?: number
): Promise<void> {
  await supabaseAdmin
    .from('ai_usage_log')
    .insert({
      provider,
      model_id: modelId,
      success,
      error_type: errorType || null,
      latency_ms: latencyMs || null,
      tokens_used: tokensUsed || null
    })
}
