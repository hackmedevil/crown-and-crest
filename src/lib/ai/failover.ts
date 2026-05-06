/**
 * AI Failover System
 * Intelligent multi-model failover with automatic rate limit handling
 */

import { generateText } from './client'
import type { AIOptions } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createNotification, logAIUsage } from '@/lib/notifications/actions'
import { decrypt } from '@/lib/utils/encryption'

interface FailoverConfig {
  provider: string
  apiKey: string
  models: string[]
  priority: string[]
  healthStatus: Record<string, ModelHealth>
}

interface ModelHealth {
  available: boolean
  lastCheck: string
  errorCount: number
  lastError?: string
}

interface FailoverResult {
  content: string
  modelUsed: string
  attemptCount: number
  failedModels: string[]
  latency: number
}

/**
 * Generate content with automatic failover
 * Tries models in priority order until one succeeds
 */
export async function generateWithFailover(
  prompt: string,
  options: AIOptions = {}
): Promise<FailoverResult> {
  const startTime = Date.now()
  
  console.log('[Failover] Starting generation with failover...')
  
  // Get active API key configuration
  const config = await getFailoverConfig()
  
  if (!config || config.priority.length === 0) {
    throw new Error('No AI models configured for failover')
  }

  const failedModels: string[] = []
  let attemptCount = 0

  // Try models in priority order
  for (const modelId of config.priority) {
    // Skip if model is known to be unhealthy
    if (config.healthStatus[modelId] && !config.healthStatus[modelId].available) {
      console.log(`[Failover] Skipping unhealthy model: ${modelId}`)
      continue
    }

    attemptCount++
    const attemptStart = Date.now()
    console.log(`[Failover] Attempt ${attemptCount}: Trying model ${modelId}`)
    
    try {
      // Try to generate with this model
      const content = await generateText(prompt, {
        ...options,
        model: modelId
      })

      const latency = Date.now() - attemptStart
      const totalTime = Date.now() - startTime

      console.log(`[Failover] ✓ Success with ${modelId} (${latency}ms)`)
      
      // Log successful usage
      await logAIUsage(config.provider, modelId, true, undefined, latency)
      
      return {
        content,
        modelUsed: modelId,
        attemptCount,
        failedModels,
        latency: totalTime
      }
    } catch (error: unknown) {
      const latency = Date.now() - attemptStart
      failedModels.push(modelId)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Failover] ✗ Failed with ${modelId}:`, errorMessage)
      
      // Detect error type
      const errorType = detectErrorType(error)
      
      // Log failed usage
      await logAIUsage(config.provider, modelId, false, errorType, latency)

      // Handle different error types
      if (errorType === 'rate_limit') {
        console.log(`[Failover] Rate limit hit on ${modelId}, trying next model...`)
        
        await createNotification({
          type: 'rate_limit',
          severity: 'warning',
          model_id: modelId,
          message: `Rate limit reached for ${modelId}`,
          details: { 
            failedModels,
            nextModel: config.priority[attemptCount] || 'none'
          }
        })
        
        // Continue to next model
        continue
      }

      if (errorType === 'model_not_found') {
        console.log(`[Failover] Model ${modelId} not found, marking as unhealthy`)
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        await markModelUnhealthy(modelId, errorMessage)
        
        await createNotification({
          type: 'model_deleted',
          severity: 'error',
          model_id: modelId,
          message: `Model ${modelId} is no longer available`,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        })
        
        // Continue to next model
        continue
      }

      // For other errors, still try next model
      console.log(`[Failover] Error type: ${errorType}, continuing to next model`)
      continue
    }
  }

  // All models failed
  console.error('[Failover] All models failed!')
  
  await createNotification({
    type: 'failover',
    severity: 'critical',
    message: `All ${config.priority.length} AI models failed`,
    details: { 
      failedModels,
      attemptCount
    }
  })
  
  throw new Error(`All AI models failed after ${attemptCount} attempts. Please check AI settings.`)
}

/**
 * Get failover configuration from active API key
 */
async function getFailoverConfig(): Promise<FailoverConfig | null> {
  const { data: activeKey } = await supabaseAdmin
    .from('ai_api_keys')
    .select(`
      id,
      encrypted_key,
      selected_models,
      model_priority,
      health_status,
      ai_providers!inner (
        name
      )
    `)
    .eq('is_active', true)
    .single()

  if (!activeKey) {
    return null
  }

  // Decrypt API key
  const encryptionKey = process.env.AI_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('AI_ENCRYPTION_KEY not set')
  }

  const apiKey = decrypt(activeKey.encrypted_key)

  return {
    provider: (activeKey.ai_providers as any).name,
    apiKey,
    models: activeKey.selected_models || [],
    priority: activeKey.model_priority || (activeKey.selected_models || []),
    healthStatus: activeKey.health_status || {}
  }
}

/**
 * Detect error type from error message
 */
function detectErrorType(error: unknown): string {
  const msg = (error instanceof Error ? error.message : '')?.toLowerCase() || ''
  
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
    return 'rate_limit'
  }
  
  if (msg.includes('quota') || msg.includes('insufficient')) {
    return 'quota_exceeded'
  }
  
  if (msg.includes('not found') || msg.includes('404') || msg.includes('does not exist')) {
    return 'model_not_found'
  }
  
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('invalid api key')) {
    return 'auth_error'
  }
  
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'timeout'
  }
  
  return 'unknown'
}

/**
 * Mark a model as unhealthy in the database
 */
async function markModelUnhealthy(modelId: string, error: string): Promise<void> {
  const { data: activeKey } = await supabaseAdmin
    .from('ai_api_keys')
    .select('id, health_status')
    .eq('is_active', true)
    .single()

  if (!activeKey) return

  const healthStatus = activeKey.health_status || {}
  
  healthStatus[modelId] = {
    available: false,
    lastCheck: new Date().toISOString(),
    errorCount: (healthStatus[modelId]?.errorCount || 0) + 1,
    lastError: error
  }

  await supabaseAdmin
    .from('ai_api_keys')
    .update({ health_status: healthStatus })
    .eq('id', activeKey.id)
}

/**
 * Update health status for a model
 */
export async function updateModelHealth(
  modelId: string,
  available: boolean,
  error?: string
): Promise<void> {
  const { data: activeKey } = await supabaseAdmin
    .from('ai_api_keys')
    .select('id, health_status')
    .eq('is_active', true)
    .single()

  if (!activeKey) return

  const healthStatus = activeKey.health_status || {}
  
  healthStatus[modelId] = {
    available,
    lastCheck: new Date().toISOString(),
    errorCount: available ? 0 : (healthStatus[modelId]?.errorCount || 0) + 1,
    lastError: error
  }

  await supabaseAdmin
    .from('ai_api_keys')
    .update({ 
      health_status: healthStatus,
      last_health_check: new Date().toISOString()
    })
    .eq('id', activeKey.id)
}
