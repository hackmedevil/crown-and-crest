/**
 * AI Provider Management Types
 */

export interface AIProvider {
  id: string
  name: string
  display_name: string
  base_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AIApiKey {
  id: string
  provider_id: string
  encrypted_key: string
  label: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface ProviderConfig {
  provider: string
  apiKey: string
  label?: string
  models?: string[]
}

export interface VerificationStep {
  step: 'connection' | 'discovery' | 'test'
  status: 'pending' | 'running' | 'success' | 'error'
  message: string
  timestamp: string
  data?: any
}

export interface VerificationResult {
  success: boolean
  steps: VerificationStep[]
  models?: DiscoveredModel[]
  error?: string
}

export interface DiscoveredModel {
  id: string
  name: string
  description: string
  pricing: string
  tier: 'free' | 'paid'
  available: boolean
  contextWindow?: number
  limits?: {
    rpm?: number
    rpd?: number
  }
}

export interface LogMessage {
  timestamp: string
  level: 'info' | 'success' | 'error' | 'warning'
  message: string
  icon?: string
}
