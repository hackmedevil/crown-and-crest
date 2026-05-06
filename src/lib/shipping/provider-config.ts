import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const SUPPLIER_PROVIDER_KEY = 'supplier_direct'

interface DbErrorShape {
  message?: string
  code?: string
}

export interface SupplierAuthConfig {
  api_key?: string
  api_secret?: string
  webhook_secret?: string
}

export interface SupplierOperationalConfig {
  supports_cod?: boolean
  supports_prepaid?: boolean
  fallback_to_shiprocket?: boolean
  default_dispatch_days?: number
  serviceable_regions?: string[]
}

export interface SupplierConfigPayload {
  provider_name: string
  is_enabled: boolean
  api_base_url: string | null
  auth_type: string
  auth_config: SupplierAuthConfig
  operational_config: SupplierOperationalConfig
  notes: string | null
  last_test_status?: string | null
  last_test_message?: string | null
  last_tested_at?: string | null
}

export function getAdminUids() {
  return process.env.ADMIN_UIDS?.split(',').map((uid) => uid.trim()).filter(Boolean) || []
}

export async function assertAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!getAdminUids().includes(user.uid)) {
    return { error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) }
  }

  return { user }
}

export function getDefaultSupplierConfig(): SupplierConfigPayload & { provider_key: string } {
  return {
    provider_key: SUPPLIER_PROVIDER_KEY,
    provider_name: 'Supplier Direct',
    is_enabled: false,
    api_base_url: null,
    auth_type: 'qikink_token',
    auth_config: {
      api_key: '',
      api_secret: '',
      webhook_secret: '',
    },
    operational_config: {
      supports_cod: true,
      supports_prepaid: true,
      fallback_to_shiprocket: true,
      default_dispatch_days: 2,
      serviceable_regions: [],
    },
    notes: 'Use this profile for Qikink-like or other supplier shipping APIs.',
    last_test_status: null,
    last_test_message: null,
    last_tested_at: null,
  }
}

export function isMissingSupplierConfigTableError(error: unknown) {
  const dbError = (error || {}) as DbErrorShape
  const message = String(dbError.message || '').toLowerCase()
  const code = String(dbError.code || '').toUpperCase()

  return (
    code === '42P01' ||
    (message.includes('shipping_provider_configs') &&
      (message.includes('does not exist') || message.includes('relation')))
  )
}

export async function ensureSupplierConfig() {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('shipping_provider_configs')
    .select('*')
    .eq('provider_key', SUPPLIER_PROVIDER_KEY)
    .maybeSingle()

  if (fetchError) {
    if (isMissingSupplierConfigTableError(fetchError)) {
      throw new Error(
        'MIGRATION_REQUIRED:shipping_provider_configs table is missing. Run the shipping provider config migration.'
      )
    }

    throw new Error(fetchError.message)
  }

  if (existing) {
    return existing
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from('shipping_provider_configs')
    .insert(getDefaultSupplierConfig())
    .select('*')
    .single()

  if (createError) {
    if (isMissingSupplierConfigTableError(createError)) {
      throw new Error(
        'MIGRATION_REQUIRED:shipping_provider_configs table is missing. Run the shipping provider config migration.'
      )
    }

    throw new Error(createError.message)
  }

  return created
}

export function sanitizeSupplierConfigPayload(body: unknown): SupplierConfigPayload {
  const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const authConfigInput =
    input.auth_config && typeof input.auth_config === 'object'
      ? (input.auth_config as Record<string, unknown>)
      : {}
  const operationalConfigInput =
    input.operational_config && typeof input.operational_config === 'object'
      ? (input.operational_config as Record<string, unknown>)
      : {}

  return {
    provider_name: String(input.provider_name || 'Supplier Direct').trim(),
    is_enabled: Boolean(input.is_enabled),
    api_base_url: input.api_base_url ? String(input.api_base_url).trim() : null,
    auth_type: input.auth_type ? String(input.auth_type).trim() : 'qikink_token',
    auth_config: {
      api_key: authConfigInput.api_key ? String(authConfigInput.api_key).trim() : '',
      api_secret: authConfigInput.api_secret ? String(authConfigInput.api_secret).trim() : '',
      webhook_secret: authConfigInput.webhook_secret ? String(authConfigInput.webhook_secret).trim() : '',
    },
    operational_config: {
      supports_cod: operationalConfigInput.supports_cod !== false,
      supports_prepaid: operationalConfigInput.supports_prepaid !== false,
      fallback_to_shiprocket: operationalConfigInput.fallback_to_shiprocket !== false,
      default_dispatch_days: Number(operationalConfigInput.default_dispatch_days) || 2,
      serviceable_regions: Array.isArray(operationalConfigInput.serviceable_regions)
        ? operationalConfigInput.serviceable_regions.map((item) => String(item).trim()).filter(Boolean)
        : [],
    },
    notes: input.notes ? String(input.notes).trim() : null,
    last_test_status: input.last_test_status ? String(input.last_test_status).trim() : null,
    last_test_message: input.last_test_message ? String(input.last_test_message).trim() : null,
    last_tested_at: input.last_tested_at ? String(input.last_tested_at).trim() : null,
  }
}

export async function updateSupplierTestStatus(status: string, message: string) {
  const existing = await ensureSupplierConfig()

  const { data, error } = await supabaseAdmin
    .from('shipping_provider_configs')
    .update({
      last_test_status: status,
      last_test_message: message,
      last_tested_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
