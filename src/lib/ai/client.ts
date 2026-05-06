'use server'

import { getActiveApiKey } from '@/lib/ai/settings/actions'
import { getSavedModelsInOrder } from '@/app/(admin)/admin/settings/ai/actions'

/**
 * Provider-Specific AI Clients
 * Each provider has its own API format and requirements
 */

export interface AIOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * OpenRouter Client
 * Uses OpenAI-compatible format with special headers
 * If no model is specified, OpenRouter will use your dashboard preset
 */
async function generateWithOpenRouter(
  prompt: string,
  apiKey: string,
  options: AIOptions = {}
): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  // Build request body - only include model if specified
  const requestBody: Record<string, unknown> = {
    messages: [{ role: 'user', content: prompt }],
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 1000,
  }
  
  // Only add model if explicitly provided, otherwise use OpenRouter preset
  if (options.model) {
    requestBody.model = options.model
  }
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': siteUrl,
      'X-Title': 'Crown and Crest Admin'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('OpenRouter error response:', errorText)
    throw new Error(`OpenRouter API error: ${response.statusText}. ${errorText}`)
  }

  const data = await response.json()
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Unexpected OpenRouter response:', data)
    throw new Error('Invalid response format from OpenRouter')
  }
  
  return data.choices[0].message.content || ''
}

/**
 * OpenAI Client
 * Standard OpenAI chat completions format
 */
async function generateWithOpenAI(
  prompt: string,
  apiKey: string,
  options: AIOptions = {}
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Anthropic Claude Client
 * Uses messages API with different format
 */
async function generateWithAnthropic(
  prompt: string,
  apiKey: string,
  options: AIOptions = {}
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'claude-3-haiku-20240307',
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.content[0]?.text || ''
}

/**
 * Google Gemini Client
 * Uses generateContent endpoint with API key in URL
 */
async function generateWithGoogle(
  prompt: string,
  apiKey: string,
  options: AIOptions = {}
): Promise<string> {
  const model = options.model || 'gemini-1.5-flash'
  
  // Ensure model has models/ prefix for the endpoint
  const modelPath = model.startsWith('models/') ? model : `models/${model}`
  
  // Correct Google AI endpoint format (use v1beta for gemini models)
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`
  
  console.log('[Google Gemini] Using model:', model)
  console.log('[Google Gemini] Endpoint:', endpoint.replace(apiKey, 'API_KEY_HIDDEN'))
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 1000,
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Google Gemini] Error response:', errorText)
    throw new Error(`Google Gemini API error: ${response.statusText}. ${errorText}`)
  }

  const data = await response.json()
  console.log('[Google Gemini] Response:', JSON.stringify(data).substring(0, 200))
  
  if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
    console.error('[Google Gemini] Unexpected response format:', data)
    throw new Error('Invalid response format from Google Gemini')
  }
  
  return data.candidates[0].content.parts[0].text
}

/**
 * Cohere Client
 * Uses generate endpoint with different format
 */
async function generateWithCohere(
  prompt: string,
  apiKey: string,
  options: AIOptions = {}
): Promise<string> {
  const response = await fetch('https://api.cohere.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || 'command-r',
      prompt: prompt,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cohere API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.generations[0]?.text || ''
}

/**
 * Generate with failover using saved model priorities
 * Tries models in priority order (1, 2, 3...) until one succeeds
 */
async function generateWithFailover(
  prompt: string,
  provider: string,
  apiKey: string,
  models: { id: string; priority: number }[],
  generateFn: (model: string) => Promise<string>
): Promise<string> {
  if (models.length === 0) {
    console.log('[Failover] No saved models found, using default model')
    return generateFn('')
  }

  let lastError: Error | null = null

  for (const model of models) {
    try {
      console.log(`[Failover] Trying priority ${model.priority}: ${model.id}`)
      const result = await generateFn(model.id)
      console.log(`[Failover] ✓ Success with ${model.id}`)
      return result
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[Failover] ✗ Failed ${model.id}: ${lastError.message}`)
      // Continue to next model
    }
  }

  // All models failed, throw last error
  throw lastError || new Error('All models failed')
}

/**
 * Universal AI Client - automatically routes to correct provider
 * Uses saved model priorities with automatic failover
 */
export async function generateText(
  prompt: string,
  options: AIOptions = {}
): Promise<string> {
  const activeKey = await getActiveApiKey()
  
  if (!activeKey) {
    throw new Error('No active AI provider configured. Please set up AI in settings.')
  }

  try {
    // Get saved models in priority order
    const savedModelsResult = await getSavedModelsInOrder(activeKey.provider)
    const savedModels = savedModelsResult.models || []

    if (savedModels.length > 0) {
      console.log(`[Generate] Using ${savedModels.length} saved priority models for ${activeKey.provider}`)
    } else {
      console.log(`[Generate] No saved models, using default for ${activeKey.provider}`)
    }

    // Create a generate function for the specific provider
    const generateFn = async (model: string): Promise<string> => {
      const modelToUse = model || (activeKey.provider === 'openrouter' 
        ? options.model 
        : (options.model || activeKey.model))

      switch (activeKey.provider) {
        case 'openrouter':
          return await generateWithOpenRouter(prompt, activeKey.apiKey, { ...options, model: modelToUse })
        
        case 'openai':
          return await generateWithOpenAI(prompt, activeKey.apiKey, { ...options, model: modelToUse })
        
        case 'anthropic':
          return await generateWithAnthropic(prompt, activeKey.apiKey, { ...options, model: modelToUse })
        
        case 'google':
          return await generateWithGoogle(prompt, activeKey.apiKey, { ...options, model: modelToUse })
        
        case 'cohere':
          return await generateWithCohere(prompt, activeKey.apiKey, { ...options, model: modelToUse })
        
        default:
          throw new Error(`Unsupported provider: ${activeKey.provider}`)
      }
    }

    // If saved models exist, use failover logic; otherwise use default
    if (savedModels.length > 0) {
      return await generateWithFailover(prompt, activeKey.provider, activeKey.apiKey, savedModels, generateFn)
    } else {
      return await generateFn('')
    }
  } catch (error: unknown) {
    console.error('AI generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate content'
    throw new Error(errorMessage)
  }
}
