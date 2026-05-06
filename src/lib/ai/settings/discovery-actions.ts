'use server'

import { requireAdmin } from '@/lib/admin/auth'

/**
 * AI Model Discovery & Testing Actions
 * Auto-discover available models and test connections
 */

export interface DiscoveredModel {
  id: string
  name: string
  description: string
  pricing: string
  tier: 'free' | 'paid'
  available: boolean
  contextWindow?: number
  limits?: {
    rpm?: number  // requests per minute
    rpd?: number  // requests per day
  }
}

export interface TestResult {
  model: string
  success: boolean
  latency?: number
  response?: string
  error?: string
  timestamp: string
}

/**
 * Discover available models for a provider
 */
export async function discoverAvailableModels(
  provider: string,
  apiKey: string
): Promise<{ success: boolean; models?: DiscoveredModel[]; error?: string }> {
  await requireAdmin()

  console.log(`[Discovery] Starting model discovery for: ${provider}`)

  try {
    switch (provider) {
      case 'openrouter':
        return await discoverOpenRouterModels(apiKey)
      
      case 'google':
        return await discoverGoogleModels(apiKey)
      
      case 'openai':
        return await discoverOpenAIModels(apiKey)
      
      default:
        return { 
          success: false, 
          error: `Model discovery not yet implemented for ${provider}` 
        }
    }
  } catch (error: unknown) {
    console.error('Model discovery error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Discovery failed'
    }
  }
}

/**
 * OpenRouter Model Discovery
 */
async function discoverOpenRouterModels(apiKey: string): Promise<{ success: boolean; models?: DiscoveredModel[]; error?: string }> {
  try {
    console.log('[OpenRouter] Fetching models...')
    
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[OpenRouter] Error:', error)
      return { success: false, error: `Failed to fetch models: ${response.statusText}` }
    }

    const data = await response.json()
    console.log(`[OpenRouter] Found ${data.data?.length || 0} models`)

    const models: DiscoveredModel[] = (data.data || [])
      .filter((model: any) => !model.id.includes('extended'))  // Filter out extended context variants
      .slice(0, 50)  // Limit to first 50 models
      .map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || 'No description',
        pricing: model.pricing?.prompt === '0' ? 'Free' : `$${model.pricing?.prompt || '?'}/1M tokens`,
        tier: model.pricing?.prompt === '0' ? 'free' as const : 'paid' as const,
        available: true,
        contextWindow: model.context_length || 0,
        limits: model.pricing?.prompt === '0' ? { rpm: 20 } : undefined
      }))

    // Sort: free models first, then by name
    models.sort((a, b) => {
      if (a.tier === 'free' && b.tier !== 'free') return -1
      if (a.tier !== 'free' && b.tier === 'free') return 1
      return a.name.localeCompare(b.name)
    })

    return { success: true, models }
  } catch (error: unknown) {
    console.error('[OpenRouter] Exception:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Google Gemini Model Discovery
 */
async function discoverGoogleModels(apiKey: string): Promise<{ success: boolean; models?: DiscoveredModel[]; error?: string }> {
  try {
    console.log('[Google] Fetching models...')
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('[Google] Error:', error)
      return { success: false, error: `Failed to fetch models: ${response.statusText}` }
    }

    const data = await response.json()
    console.log(`[Google] Found ${data.models?.length || 0} models`)

    const models: DiscoveredModel[] = (data.models || [])
      .filter((model: any) => 
        model.supportedGenerationMethods?.includes('generateContent') &&
        model.name.includes('gemini')
      )
      .map((model: any) => {
        // Extract just the model ID without the "models/" prefix
        // Google returns "models/gemini-1.5-flash" but we only need "gemini-1.5-flash"
        const modelId = model.name.replace('models/', '')
        const isFree = modelId.includes('flash') || modelId.includes('1.5')
        
        return {
          id: modelId,
          name: model.displayName || modelId,
          description: model.description || 'Google Gemini model',
          pricing: isFree ? 'Free (rate limited)' : 'Paid',
          tier: isFree ? 'free' as const : 'paid' as const,
          available: true,
          contextWindow: model.inputTokenLimit || 0,
          limits: isFree ? { rpm: modelId.includes('pro') ? 2 : 15 } : undefined
        }
      })

    return { success: true, models }
  } catch (error: unknown) {
    console.error('[Google] Exception:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * OpenAI Model Discovery
 */
async function discoverOpenAIModels(apiKey: string): Promise<{ success: boolean; models?: DiscoveredModel[]; error?: string }> {
  try {
    console.log('[OpenAI] Fetching models...')
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[OpenAI] Error:', error)
      return { success: false, error: `Failed to fetch models: ${response.statusText}` }
    }

    const data = await response.json()
    console.log(`[OpenAI] Found ${data.data?.length || 0} models`)

    // Filter for GPT models only
    const models: DiscoveredModel[] = (data.data || [])
      .filter((model: { id: string }) => model.id.includes('gpt'))
      .map((model: { id: string; context_length?: number; input_cost_per_token?: number; output_cost_per_token?: number }) => ({
        id: model.id,
        name: model.id,
        description: `OpenAI ${model.id}`,
        pricing: model.id.includes('3.5') ? '$0.50/1M tokens' : '$10/1M tokens',
        tier: 'paid' as const,
        available: true,
        contextWindow: model.id.includes('gpt-4') ? 128000 : 16385
      }))

    return { success: true, models }
  } catch (error: unknown) {
    console.error('[OpenAI] Exception:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Test a specific model with a sample prompt
 */
export async function testModelConnection(
  provider: string,
  apiKey: string,
  modelId: string
): Promise<TestResult> {
  await requireAdmin()

  const testPrompt = "Say 'Hello' in one word."
  const startTime = Date.now()

  console.log(`[Test] Testing ${provider}/${modelId}...`)

  try {
    // Dynamic import the AI client
    const { generateText } = await import('@/lib/ai/client')
    
    // This is a simplified test - we'd need to call the specific provider
    // For now, just test if the model ID is valid
    const response = await fetch(getTestEndpoint(provider, modelId, apiKey), {
      method: 'POST',
      headers: getTestHeaders(provider, apiKey),
      body: JSON.stringify(getTestBody(provider, modelId, testPrompt))
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Test] Failed: ${error}`)
      return {
        model: modelId,
        success: false,
        error: `HTTP ${response.status}: ${error.substring(0, 100)}`,
        timestamp: new Date().toISOString()
      }
    }

    const data = await response.json()
    const responseText = extractResponse(provider, data)

    console.log(`[Test] Success: ${responseText} (${latency}ms)`)

    return {
      model: modelId,
      success: true,
      latency,
      response: responseText,
      timestamp: new Date().toISOString()
    }
  } catch (error: unknown) {
    console.error(`[Test] Exception:`, error)
    return {
      model: modelId,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
}

// Helper functions for testing
function getTestEndpoint(provider: string, modelId: string, apiKey: string): string {
  switch (provider) {
    case 'openrouter':
      return 'https://openrouter.ai/api/v1/chat/completions'
    case 'google':
      return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`
    case 'openai':
      return 'https://api.openai.com/v1/chat/completions'
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

function getTestHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (provider === 'openrouter' || provider === 'openai') {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  return headers
}

function getTestBody(provider: string, modelId: string, prompt: string): Record<string, unknown> {
  if (provider === 'google') {
    return {
      contents: [{ parts: [{ text: prompt }] }]
    }
  }

  // OpenRouter & OpenAI use same format
  return {
    model: modelId,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 10
  }
}

function extractResponse(provider: string, data: Record<string, unknown>): string {
  const responseData = data as any
  if (provider === 'google') {
    return responseData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response'
  }

  // OpenRouter & OpenAI
  return responseData.choices?.[0]?.message?.content || 'No response'
}

/**
 * Test multiple models in batch
 */
export async function testMultipleModels(
  provider: string,
  apiKey: string,
  modelIds: string[]
): Promise<TestResult[]> {
  await requireAdmin()

  console.log(`[Batch Test] Testing ${modelIds.length} models...`)

  const results: TestResult[] = []

  // Test one at a time to avoid rate limits
  for (const modelId of modelIds) {
    const result = await testModelConnection(provider, apiKey, modelId)
    results.push(result)
    
    // Wait 1 second between tests to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}
