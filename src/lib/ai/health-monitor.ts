/**
 * AI Health Monitoring System
 * Periodically checks model availability and updates health status
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { testModelConnection } from './settings/discovery-actions'
import { updateModelHealth } from './failover'
import { createNotification } from '@/lib/notifications/actions'
import { decrypt } from '@/lib/utils/encryption'

interface ActiveKey {
  id: string
  provider_name: string
  encrypted_key: string
  selected_models: string[]
  health_status: Record<string, any>
}

/**
 * Get all active API keys with their models
 */
async function getActiveApiKeys(): Promise<ActiveKey[]> {
  const { data } = await supabaseAdmin
    .from('ai_api_keys')
    .select(`
      id,
      encrypted_key,
      selected_models,
      health_status,
      ai_providers!inner (
        name
      )
    `)
    .eq('is_active', true)

  if (!data) return []

  interface HealthKey {
    id: string
    key_name: string
    provider: string
  }
  return data.map((dbKey: any) => ({
    id: dbKey.id,
    provider_name: dbKey.ai_providers.name,
    encrypted_key: dbKey.encrypted_key,
    selected_models: dbKey.selected_models || [],
    health_status: dbKey.health_status || {}
  }))
}

/**
 * Run health checks on all active models
 */
export async function runHealthCheck(): Promise<{
  checked: number
  healthy: number
  unhealthy: number
  errors: string[]
}> {
  console.log('[Health Monitor] Starting health check...')
  
  const encryptionKey = process.env.AI_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('AI_ENCRYPTION_KEY not configured')
  }

  let checked = 0
  let healthy = 0
  let unhealthy = 0
  const errors: string[] = []

  try {
    const activeKeys = await getActiveApiKeys()
    console.log(`[Health Monitor] Checking ${activeKeys.length} active API keys`)

    for (const key of activeKeys) {
      const apiKey = decrypt(key.encrypted_key)
      const models = key.selected_models

      if (models.length === 0) {
        console.log(`[Health Monitor] No models configured for ${key.provider_name}`)
        continue
      }

      for (const modelId of models) {
        checked++
        console.log(`[Health Monitor] Testing ${key.provider_name}/${modelId}...`)

        try {
          const result = await testModelConnection(
            key.provider_name,
            apiKey,
            modelId
          )

          // Update health status
          await updateModelHealth(modelId, result.success, result.error)

          if (result.success) {
            healthy++
            console.log(`[Health Monitor] ✓ ${modelId} is healthy`)
          } else {
            unhealthy++
            console.log(`[Health Monitor] ✗ ${modelId} is unhealthy: ${result.error}`)

            // Check if model was previously healthy (new failure)
            const wasHealthy = key.health_status[modelId]?.available !== false

            if (wasHealthy) {
              // Create notification for newly failed model
              await createNotification({
                type: 'health_check_failed',
                severity: 'error',
                model_id: modelId,
                message: `Health check failed for ${modelId}`,
                details: {
                  provider: key.provider_name,
                  error: result.error,
                  timestamp: result.timestamp
                }
              })
            }
          }

          // Rate limit protection - wait 1 second between checks
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error: unknown) {
          unhealthy++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${modelId}: ${errorMessage}`)
          console.error(`[Health Monitor] Error testing ${modelId}:`, error)

          await updateModelHealth(modelId, false, errorMessage)
        }
      }
    }

    console.log(`[Health Monitor] Complete: ${checked} checked, ${healthy} healthy, ${unhealthy} unhealthy`)
    
    return { checked, healthy, unhealthy, errors }
  } catch (error: unknown) {
    console.error('[Health Monitor] Fatal error:', error)
    throw error
  }
}

/**
 * Get health check statistics
 */
export async function getHealthStats(): Promise<{
  totalModels: number
  healthyModels: number
  unhealthyModels: number
  lastCheck?: string
}> {
  const { data } = await supabaseAdmin
    .from('ai_api_keys')
    .select('selected_models, health_status, last_health_check')
    .eq('is_active', true)
    .single()

  if (!data) {
    return {
      totalModels: 0,
      healthyModels: 0,
      unhealthyModels: 0
    }
  }

  const models = data.selected_models || []
  const healthStatus = data.health_status || {}

  const healthyModels = models.filter(
    (modelId: string) => healthStatus[modelId]?.available !== false
  ).length

  return {
    totalModels: models.length,
    healthyModels,
    unhealthyModels: models.length - healthyModels,
    lastCheck: data.last_health_check
  }
}
