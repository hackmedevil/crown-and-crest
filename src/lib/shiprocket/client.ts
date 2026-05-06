// Shiprocket HTTP Client
// Generic request handler with automatic token injection

import { getShiprocketToken } from './auth'

const SHIPROCKET_API_URL = 'https://apiv2.shiprocket.in/v1'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  params?: Record<string, string | number | boolean>
}

/**
 * Generic Shiprocket API request handler
 * Automatically injects Bearer token and handles auth refresh
 */
export async function shiprocketRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, params } = options

  // Get valid auth token
  const token = await getShiprocketToken()

  // Build URL with query params
  const url = new URL(`${SHIPROCKET_API_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
  }

  // Build request config
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  }

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body)
  }

  try {
    console.log(`[SHIPROCKET_CLIENT] ${method} ${endpoint}`)
    const response = await fetch(url.toString(), config)

    // Handle 401 - token might be expired, try refresh once
    if (response.status === 401) {
      console.warn('[SHIPROCKET_CLIENT] 401 Unauthorized - token may be expired')
      // Retry logic could be added here, but for now just throw
      throw new Error('Shiprocket authentication failed')
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[SHIPROCKET_CLIENT] API error:`, response.status, errorText)
      throw new Error(`Shiprocket API error: ${response.status} - ${errorText}`)
    }

    const data: T = await response.json()
    return data

  } catch (error) {
    console.error(`[SHIPROCKET_CLIENT] Request failed for ${endpoint}:`, error)
    throw error
  }
}
