import { supabaseServer } from '@/lib/supabase/server'
import { StoreSettings, DEFAULT_STORE_SETTINGS } from '@/types/store'

/**
 * Fetch store settings from database
 * Returns default settings if database fetch fails
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const { data, error } = await supabaseServer
      .from('store_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      console.error('Failed to fetch store settings:', error)
      return DEFAULT_STORE_SETTINGS
    }

    return data || DEFAULT_STORE_SETTINGS
  } catch (error) {
    console.error('Error fetching store settings:', error)
    return DEFAULT_STORE_SETTINGS
  }
}
