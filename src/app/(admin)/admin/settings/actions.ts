'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { StoreSettings, StoreSettingsUpdate } from '@/types/store'

/**
 * Get current store settings
 */
export async function getStoreSettingsAction(): Promise<{ data: StoreSettings | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error: 'Failed to fetch store settings' }
  }
}

/**
 * Update store settings (admin only)
 */
export async function updateStoreSettingsAction(
  updates: StoreSettingsUpdate
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check authentication and admin authorization
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Verify user is admin
    const ADMIN_UIDS = process.env.ADMIN_UIDS?.split(',') || []
    if (!ADMIN_UIDS.includes(user.uid)) {
      return { success: false, error: 'Unauthorized - Admin access required' }
    }

    // Update store settings
    const { error } = await supabaseAdmin
      .from('store_settings')
      .update(updates)
      .eq('id', 1)

    if (error) {
      console.error('Failed to update store settings:', error)
      return { success: false, error: error.message }
    }

    // Revalidate all pages to reflect new branding
    revalidatePath('/', 'layout')
    revalidatePath('/admin', 'layout')

    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating store settings:', error)
    return { success: false, error: 'Failed to update store settings' }
  }
}
