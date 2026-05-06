/**
 * Store Settings Types
 * Global store configuration including branding
 */

export interface StoreSettings {
  id: number
  store_name: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface StoreSettingsUpdate {
  store_name?: string
  logo_url?: string | null
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 1,
  store_name: 'Crown & Crest',
  logo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
