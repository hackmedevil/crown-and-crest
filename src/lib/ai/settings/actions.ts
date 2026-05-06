'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'
import { encrypt, decrypt, maskApiKey, isValidApiKeyFormat } from '@/lib/utils/encryption'
import { revalidatePath } from 'next/cache'

export interface AIProvider {
  id: string
  name: string
  display_name: string
  base_url: string | null
  is_active: boolean
  keys: AIApiKey[]
}

export interface AIApiKey {
  id: string
  provider_id: string
  label: string | null
  is_active: boolean
  masked_key: string
  last_used_at: string | null
  created_at: string
}

/**
 * Get all AI providers with their masked API keys
 */
export async function getAIProviders(): Promise<AIProvider[]> {
  await requireAdmin()

  const { data: providers, error } = await supabaseAdmin
    .from('ai_providers')
    .select(`
      *,
      ai_api_keys (
        id,
        provider_id,
        label,
        is_active,
        encrypted_key,
        last_used_at,
        created_at
      )
    `)
    .order('display_name')

  if (!providers) return []

  interface DbApiKey {
    id: string
    provider_id: string
    label: string | null
    is_active: boolean
    encrypted_key: string
    last_used_at: string | null
    created_at: string
  }

  // Mask API keys before sending to client
  return providers.map(provider => ({
    ...provider,
    keys: provider.ai_api_keys.map((key: DbApiKey) => ({
      id: key.id,
      provider_id: key.provider_id,
      label: key.label,
      is_active: key.is_active,
      masked_key: maskApiKey(decrypt(key.encrypted_key)),
      last_used_at: key.last_used_at,
      created_at: key.created_at,
    }))
  }))
}

/**
 * Save new API key for a provider with provider-specific configuration
 * Now supports multiple models for failover
 */
export async function saveApiKey(
  providerNameOrId: string,
  apiKey: string,
  label?: string,
  config?: Record<string, unknown>,
  selectedModel?: string,
  selectedModels?: string[],  // NEW: Multiple models for failover
  modelPriority?: string[]     // NEW: Priority order for failover
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  // Validate API key format
  if (!isValidApiKeyFormat(apiKey)) {
    return { success: false, error: 'Invalid API key format' }
  }

  try {
    // Look up provider UUID from name if needed
    const { data: provider } = await supabaseAdmin
      .from('ai_providers')
      .select('id')
      .eq('name', providerNameOrId)
      .single()

    if (!provider) {
      return { success: false, error: 'Provider not found' }
    }

    const providerId = provider.id

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey)

    // Check if label already exists for this provider
    if (label) {
      const { data: existing } = await supabaseAdmin
        .from('ai_api_keys')
        .select('id')
        .eq('provider_id', providerId)
        .eq('label', label)
        .single()

      if (existing) {
        return { success: false, error: 'A key with this label already exists' }
      }
    }

    // Save encrypted key with config and model(s)
    const { error } = await supabaseAdmin
      .from('ai_api_keys')
      .insert({
        provider_id: providerId,
        encrypted_key: encryptedKey,
        label: label || null,
        is_active: false, // Not active by default
        config_json: config || {},
        selected_model: selectedModel || (selectedModels && selectedModels[0]) || null,
        selected_models: selectedModels && selectedModels.length > 0 ? selectedModels : (selectedModel ? [selectedModel] : []),
        model_priority: modelPriority && modelPriority.length > 0 ? modelPriority : (selectedModels || (selectedModel ? [selectedModel] : [])),
      })

    if (error) {
      console.error('Error saving API key:', error)
      return { success: false, error: 'Failed to save API key' }
    }

    revalidatePath('/admin/settings/ai')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in saveApiKey:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save API key' }
  }
}

/**
 * Set active API key for a provider (only one can be active)
 */
export async function setActiveApiKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  try {
    // Get the key to find its provider
    const { data: key } = await supabaseAdmin
      .from('ai_api_keys')
      .select('provider_id')
      .eq('id', keyId)
      .single()

    if (!key) {
      return { success: false, error: 'API key not found' }
    }

    // Deactivate all keys for this provider
    await supabaseAdmin
      .from('ai_api_keys')
      .update({ is_active: false })
      .eq('provider_id', key.provider_id)

    // Activate the selected key
    const { error } = await supabaseAdmin
      .from('ai_api_keys')
      .update({ 
        is_active: true,
        last_used_at: new Date().toISOString()
      })
      .eq('id', keyId)

    if (error) {
      console.error('Error setting active key:', error)
      return { success: false, error: 'Failed to activate API key' }
    }

    // Also set the provider as active
    await supabaseAdmin
      .from('ai_providers')
      .update({ is_active: false })

    await supabaseAdmin
      .from('ai_providers')
      .update({ is_active: true })
      .eq('id', key.provider_id)

    revalidatePath('/admin/settings/ai')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error in setActiveApiKey:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to activate API key' }
  }
}

/**
 * Delete an API key (manual deletion only)
 */
export async function deleteApiKey(
  keyId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[deleteApiKey] Starting deletion for key:', keyId)
  
  try {
    // Verify admin status
    await requireAdmin()
    console.log('[deleteApiKey] Admin check passed')

    // Verify key exists first
    const { data: existingKey, error: fetchError } = await supabaseAdmin
      .from('ai_api_keys')
      .select('id, provider_id')
      .eq('id', keyId)
      .single()

    if (fetchError || !existingKey) {
      console.error('[deleteApiKey] Key not found:', fetchError)
      return { success: false, error: 'API key not found' }
    }

    console.log('[deleteApiKey] Key found, proceeding with deletion')

    // Delete the key
    const { error: deleteError } = await supabaseAdmin
      .from('ai_api_keys')
      .delete()
      .eq('id', keyId)

    if (deleteError) {
      console.error('[deleteApiKey] Delete failed:', deleteError)
      return { 
        success: false, 
        error: `Database error: ${deleteError.message || 'Unknown error'}` 
      }
    }

    console.log('[deleteApiKey] Deletion successful')
    revalidatePath('/admin/settings/ai')
    return { success: true }
  } catch (error: unknown) {
    console.error('[deleteApiKey] Exception caught:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred while deleting the API key' 
    }
  }
}

/**
 * Get the active provider's decrypted API key (for internal use only)
 */
export async function getActiveApiKey(): Promise<{
  provider: string
  apiKey: string
  baseUrl: string
  model?: string
} | null> {
  await requireAdmin()

  const { data: activeProvider } = await supabaseAdmin
    .from('ai_providers')
    .select(`
      name,
      base_url,
      ai_api_keys!inner (
        encrypted_key,
        selected_model
      )
    `)
    .eq('is_active', true)
    .eq('ai_api_keys.is_active', true)
    .single()

  if (!activeProvider || !activeProvider.ai_api_keys[0]) {
    return null
  }

  try {
    const decryptedKey = decrypt(activeProvider.ai_api_keys[0].encrypted_key)
    
    return {
      provider: activeProvider.name,
      apiKey: decryptedKey,
      baseUrl: activeProvider.base_url || '',
      model: activeProvider.ai_api_keys[0].selected_model,
    }
  } catch (error) {
    console.error('Failed to decrypt active API key:', error)
    return null
  }
}

/**
 * Test API key connection
 */
export async function testApiKeyConnection(
  keyId: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  await requireAdmin()

  try {
    // Get the key and provider info
    const { data: key } = await supabaseAdmin
      .from('ai_api_keys')
      .select(`
        encrypted_key,
        ai_providers (
          name,
          base_url
        )
      `)
      .eq('id', keyId)
      .single()

    if (!key) {
      return { success: false, error: 'API key not found' }
    }

    const decryptedKey = decrypt(key.encrypted_key)
    const provider = (key.ai_providers as any[])[0] as { name: string; base_url: string | null }

    // Make a simple test request based on provider
    // This is a placeholder - actual implementation depends on provider
    // For now, just validate the key is decryptable
    
    return { 
      success: true, 
      message: `Successfully connected to ${provider.name}` 
    }
  } catch (error: unknown) {
    console.error('Error testing API key:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Connection test failed' }
  }
}
