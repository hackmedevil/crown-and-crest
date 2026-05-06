'use server'

import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/utils/encryption'
import { discoverAvailableModels, testModelConnection } from '@/lib/ai/settings/discovery-actions'
import type { ProviderConfig, VerificationResult, VerificationStep, DiscoveredModel } from '@/types/ai-provider'

/**
 * Step 1: Verify provider connection
 * Tests basic API connectivity
 */
export async function verifyProviderConnection(
  provider: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  try {
    console.log(`[Verification] Testing ${provider} connection...`)

    // Use existing discovery to verify connection
    const result = await discoverAvailableModels(provider, apiKey)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    // Verify we got at least some models
    if (!result.models || result.models.length === 0) {
      return { success: false, error: 'No models found - API key may be invalid' }
    }

    console.log(`[Verification] ✓ ${provider} connection successful`)
    return { success: true }
  } catch (error) {
    console.error('[Verification] Connection failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

/**
 * Step 2: Discover and verify models
 * Returns discovered models with test results
 */
export async function discoverAndVerifyModels(
  provider: string,
  apiKey: string
): Promise<{ success: boolean; models?: DiscoveredModel[]; error?: string }> {
  await requireAdmin()

  try {
    console.log(`[Discovery] Discovering ${provider} models...`)

    // Discover available models
    const result = await discoverAvailableModels(provider, apiKey)

    if (!result.success || !result.models) {
      return { success: false, error: result.error || 'Discovery failed' }
    }

    console.log(`[Discovery] ✓ Found ${result.models.length} models`)

    // Test a sample model to verify API works
    if (result.models.length > 0) {
      const testModel = result.models[0] // Test first model
      console.log(`[Discovery] Testing model: ${testModel.id}...`)

      try {
        const testResult = await testModelConnection(provider, apiKey, testModel.id)
        if (!testResult.success) {
          console.warn(`[Discovery] Test failed but continuing: ${testResult.error}`)
        } else {
          console.log(`[Discovery] ✓ Model test successful (${testResult.latency}ms)`)
        }
      } catch (testError) {
        // Don't fail discovery if test fails, just warn
        console.warn('[Discovery] Model test failed, but models discovered successfully')
      }
    }

    return { success: true, models: result.models }
  } catch (error) {
    console.error('[Discovery] Failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Discovery failed'
    }
  }
}

/**
 * Full verification flow with all steps
 * Returns detailed step-by-step results
 */
export async function verifyProviderFull(
  provider: string,
  apiKey: string
): Promise<VerificationResult> {
  await requireAdmin()

  const steps: VerificationStep[] = []
  const addStep = (step: Omit<VerificationStep, 'timestamp'>) => {
    steps.push({ ...step, timestamp: new Date().toISOString() })
  }

  try {
    // Step 1: Connection test
    addStep({ step: 'connection', status: 'running', message: `Connecting to ${provider}...` })
    const connectionResult = await verifyProviderConnection(provider, apiKey)

    if (!connectionResult.success) {
      addStep({ step: 'connection', status: 'error', message: connectionResult.error || 'Connection failed' })
      return { success: false, steps, error: connectionResult.error }
    }

    addStep({ step: 'connection', status: 'success', message: 'Connection established' })

    // Step 2: Model discovery
    addStep({ step: 'discovery', status: 'running', message: 'Discovering available models...' })
    const discoveryResult = await discoverAndVerifyModels(provider, apiKey)

    if (!discoveryResult.success) {
      addStep({ step: 'discovery', status: 'error', message: discoveryResult.error || 'Discovery failed' })
      return { success: false, steps, error: discoveryResult.error }
    }

    addStep({
      step: 'discovery',
      status: 'success',
      message: `Found ${discoveryResult.models?.length || 0} models`,
      data: { modelCount: discoveryResult.models?.length }
    })

    // Step 3: Model testing (optional, already done in discovery)
    addStep({ step: 'test', status: 'success', message: 'Verification complete' })

    return {
      success: true,
      steps,
      models: discoveryResult.models
    }
  } catch (error) {
    console.error('[Verification] Full verification failed:', error)
    addStep({
      step: 'connection',
      status: 'error',
      message: error instanceof Error ? error.message : 'Verification failed'
    })
    return {
      success: false,
      steps,
      error: error instanceof Error ? error.message : 'Verification failed'
    }
  }
}

/**
 * Save provider configuration to database
 * Encrypts API key and stores with models
 */
export async function saveProviderConfiguration(
  config: ProviderConfig
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  try {
    console.log(`[Save] Saving configuration for ${config.provider}...`)

    // Get provider ID
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_providers')
      .select('id')
      .eq('name', config.provider)
      .single()

    if (providerError || !provider) {
      return { success: false, error: 'Provider not found in database' }
    }

    // Encrypt API key
    const encryptedKey = encrypt(config.apiKey)

    // Check if key already exists for this provider
    const { data: existingKey } = await supabaseAdmin
      .from('ai_api_keys')
      .select('id')
      .eq('provider_id', provider.id)
      .eq('label', config.label || 'Default')
      .single()

    if (existingKey) {
      // Update existing key
      const { error: updateError } = await supabaseAdmin
        .from('ai_api_keys')
        .update({
          encrypted_key: encryptedKey,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingKey.id)

      if (updateError) {
        console.error('[Save] Update failed:', updateError)
        return { success: false, error: 'Failed to update API key' }
      }
    } else {
      // Deactivate other keys for this provider
      await supabaseAdmin
        .from('ai_api_keys')
        .update({ is_active: false })
        .eq('provider_id', provider.id)

      // Insert new key
      const { error: insertError } = await supabaseAdmin
        .from('ai_api_keys')
        .insert({
          provider_id: provider.id,
          encrypted_key: encryptedKey,
          label: config.label || 'Default',
          is_active: true
        })

      if (insertError) {
        console.error('[Save] Insert failed:', insertError)
        return { success: false, error: 'Failed to save API key' }
      }
    }

    // Activate the provider
    const { error: activateError } = await supabaseAdmin
      .from('ai_providers')
      .update({ is_active: true })
      .eq('id', provider.id)

    if (activateError) {
      console.error('[Save] Provider activation failed:', activateError)
      // Don't fail completely, key is saved
    }

    console.log(`[Save] ✓ Configuration saved and activated for ${config.provider}`)
    return { success: true }
  } catch (error) {
    console.error('[Save] Save failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Save failed'
    }
  }
}

/**
 * Get all configured providers with their status
 */
export async function getConfiguredProviders() {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('ai_providers')
    .select(`
      *,
      ai_api_keys (
        id,
        label,
        is_active,
        last_used_at,
        created_at
      )
    `)
    .order('name')

  if (error) {
    console.error('[Get Providers] Failed:', error)
    return { success: false, error: error.message }
  }

  return { success: true, providers: data }
}

/**
 * Delete provider configuration
 */
export async function deleteProviderConfiguration(
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  try {
    // Delete all API keys for this provider (cascade will handle it)
    const { error } = await supabaseAdmin
      .from('ai_api_keys')
      .delete()
      .eq('provider_id', providerId)

    if (error) {
      return { success: false, error: error.message }
    }

    // Deactivate provider
    await supabaseAdmin
      .from('ai_providers')
      .update({ is_active: false })
      .eq('id', providerId)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }
  }
}

/**
 * Get active providers with decrypted API keys for model discovery
 */
export async function getActiveProvidersWithKeys(): Promise<{
  success: boolean
  providers?: Array<{ name: string; apiKey: string; displayName: string }>
  error?: string
}> {
  await requireAdmin()

  try {
    const { data, error } = await supabaseAdmin
      .from('ai_providers')
      .select(`
        name,
        display_name,
        ai_api_keys (
          encrypted_key,
          is_active
        )
      `)
      .eq('is_active', true)
      .eq('ai_api_keys.is_active', true)

    if (error) {
      return { success: false, error: error.message }
    }

    const providers = (data || [])
      .filter((p: any) => p.ai_api_keys && p.ai_api_keys.length > 0)
      .map((p: any) => ({
        name: p.name,
        displayName: p.display_name,
        apiKey: decrypt(p.ai_api_keys[0].encrypted_key)
      }))

    return { success: true, providers }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch providers'
    }
  }
}

/**
 * Refresh models for all active providers
 */
export async function refreshAllModels(): Promise<{
  success: boolean
  results?: Record<string, { models: DiscoveredModel[]; error?: string }>
  error?: string
}> {
  await requireAdmin()

  try {
    const providersResult = await getActiveProvidersWithKeys()
    if (!providersResult.success || !providersResult.providers) {
      return { success: false, error: providersResult.error || 'No active providers found' }
    }

    const results: Record<string, { models: DiscoveredModel[]; error?: string }> = {}

    for (const provider of providersResult.providers) {
      const discoveryResult = await discoverAvailableModels(provider.name, provider.apiKey)
      
      if (discoveryResult.success && discoveryResult.models) {
        results[provider.name] = { models: discoveryResult.models }
      } else {
        results[provider.name] = { 
          models: [], 
          error: discoveryResult.error || 'Discovery failed' 
        }
      }
    }

    return { success: true, results }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refresh failed'
    }
  }
}

/**
 * Test a specific model from a provider
 */
export async function testProviderModel(
  providerName: string,
  modelId: string
): Promise<{ success: boolean; latency?: number; error?: string }> {
  await requireAdmin()

  try {
    // Get provider API key
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_providers')
      .select(`
        id,
        name,
        ai_api_keys (
          encrypted_key,
          is_active
        )
      `)
      .eq('name', providerName)
      .eq('is_active', true)
      .single()

    if (providerError || !provider) {
      return { success: false, error: 'Provider not found or not active' }
    }

    const activeKey = (provider.ai_api_keys as any[])?.find((k: any) => k.is_active)
    if (!activeKey) {
      return { success: false, error: 'No active API key found' }
    }

    const apiKey = decrypt(activeKey.encrypted_key)
    const result = await testModelConnection(providerName, apiKey, modelId)

    return {
      success: result.success,
      latency: result.latency,
      error: result.error
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    }
  }
}

/**
 * Save model priority for a provider
 */
export async function saveModelPriority(
  providerName: string,
  modelId: string,
  priority: number
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()

  try {
    console.log(`[Priority] Saving priority ${priority} for ${providerName}/${modelId}`)

    // Get provider ID
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_providers')
      .select('id')
      .eq('name', providerName)
      .single()

    if (providerError || !provider) {
      console.error('[Priority] Provider not found:', providerError)
      return { success: false, error: `Provider not found: ${providerError?.message || 'Unknown'}` }
    }

    console.log(`[Priority] Provider ID: ${provider.id}`)

    // Check if model priority already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('ai_model_priorities')
      .select('id')
      .eq('provider_id', provider.id)
      .eq('model_id', modelId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected
      console.error('[Priority] Check error:', checkError)
      return { success: false, error: `Database error: ${checkError.message}. Table may not exist - check migration status.` }
    }

    if (existing) {
      console.log(`[Priority] Updating existing priority record: ${existing.id}`)
      // Update existing
      const { error: updateError } = await supabaseAdmin
        .from('ai_model_priorities')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) {
        console.error('[Priority] Update failed:', updateError)
        return { success: false, error: `Update failed: ${updateError.message}` }
      }
    } else {
      console.log('[Priority] Inserting new priority record')
      // Insert new
      const { error: insertError } = await supabaseAdmin
        .from('ai_model_priorities')
        .insert({
          provider_id: provider.id,
          model_id: modelId,
          priority
        })

      if (insertError) {
        console.error('[Priority] Insert failed:', insertError)
        return { success: false, error: `Insert failed: ${insertError.message}. Check if ai_model_priorities table exists.` }
      }
    }

    console.log(`[Priority] ✓ Priority saved successfully`)
    return { success: true }
  } catch (error) {
    console.error('[Priority] Exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Save failed'
    }
  }
}

/**
 * Get model priorities for a provider
 */
export async function getModelPriorities(
  providerName: string
): Promise<{
  success: boolean
  priorities?: Record<string, number>
  error?: string
}> {
  await requireAdmin()

  try {
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_providers')
      .select(`
        id,
        ai_model_priorities (
          model_id,
          priority
        )
      `)
      .eq('name', providerName)
      .single()

    if (providerError || !provider) {
      return { success: false, error: 'Provider not found' }
    }

    const priorities: Record<string, number> = {}
    const priorityData = (provider as any).ai_model_priorities || []

    priorityData.forEach((p: any) => {
      priorities[p.model_id] = p.priority
    })

    return { success: true, priorities }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get priorities'
    }
  }
}

/**
 * Get saved selected models in priority order (for failover)
 * Returns only models that were selected and saved by the user
 */
export async function getSavedModelsInOrder(
  providerName: string
): Promise<{
  success: boolean
  models?: { id: string; priority: number }[]
  error?: string
}> {
  try {
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('ai_providers')
      .select('id')
      .eq('name', providerName)
      .single()

    if (providerError || !provider) {
      console.log(`[Model Order] No saved models for provider: ${providerName}`)
      return { success: true, models: [] }
    }

    // Get all saved models sorted by priority (ascending, lower = higher priority)
    const { data: savedModels, error: modelsError } = await supabaseAdmin
      .from('ai_model_priorities')
      .select('model_id, priority')
      .eq('provider_id', provider.id)
      .eq('is_enabled', true)
      .order('priority', { ascending: true })

    if (modelsError) {
      console.warn(`[Model Order] Error fetching saved models:`, modelsError)
      return { success: true, models: [] }
    }

    const models = (savedModels || []).map((m: any) => ({
      id: m.model_id,
      priority: m.priority
    }))

    console.log(`[Model Order] Found ${models.length} saved models for ${providerName}:`, models.map(m => m.id))

    return { success: true, models }
  } catch (error) {
    console.warn('[Model Order] Failed to get saved models:', error)
    return { success: true, models: [] } // Don't fail, just return empty
  }
}
