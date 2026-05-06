/**
 * AI Provider Configuration System
 * Defines provider-specific settings and requirements
 */

export interface ProviderConfig {
  name: string
  displayName: string
  baseUrl: string
  authType: 'bearer' | 'api-key' | 'url-param'
  authHeaderName?: string // e.g., 'x-api-key' for Anthropic
  requiresVersion?: boolean
  versionHeaderName?: string
  additionalHeaders?: Record<string, string>
  defaultModel: string
  availableModels: ModelOption[]
  configFields: ConfigField[]
  pricing: {
    freeTier: boolean
    description: string
  }
  documentation: string
}

export interface ModelOption {
  id: string
  name: string
  description: string
  contextWindow: number
  pricing?: string
}

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'select' | 'number' | 'toggle'
  required: boolean
  placeholder?: string
  helpText?: string
  options?: { value: string; label: string }[]
  defaultValue?: unknown
}

/**
 * Provider Configurations
 * Each provider can have custom settings
 */
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  openrouter: {
    name: 'openrouter',
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    authType: 'bearer',
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free',
    additionalHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || '',
      'X-Title': 'Crown and Crest Admin'
    },
    availableModels: [
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B (Free)',
        description: 'Fast, free model from Meta',
        contextWindow: 8192,
        pricing: 'Free'
      },
      {
        id: 'google/gemini-flash-1.5:free',
        name: 'Gemini 1.5 Flash (Free)',
        description: 'Google\'s fast model',
        contextWindow: 32768,
        pricing: 'Free'
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast, affordable Claude model',
        contextWindow: 200000,
        pricing: '$0.25/1M tokens'
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        description: 'Best balance of speed and capability',
        contextWindow: 200000,
        pricing: '$3/1M input'
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'OpenAI\'s most capable model',
        contextWindow: 128000,
        pricing: '$10/1M input'
      }
    ],
    configFields: [
      {
        key: 'siteUrl',
        label: 'Site URL',
        type: 'text',
        required: false,
        placeholder: 'https://yoursite.com',
        helpText: 'Optional: For rankings on openrouter.ai'
      },
      {
        key: 'appTitle',
        label: 'App Title',
        type: 'text',
        required: false,
        placeholder: 'My E-commerce Site',
        helpText: 'Optional: For rankings on openrouter.ai'
      }
    ],
    pricing: {
      freeTier: true,
      description: 'Free models available, pay-per-use for premium models'
    },
    documentation: 'https://openrouter.ai/docs'
  },

  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authType: 'bearer',
    defaultModel: 'gpt-3.5-turbo',
    availableModels: [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and affordable',
        contextWindow: 16385,
        pricing: '$0.50/1M input, $1.50/1M output'
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Most capable, best for complex tasks',
        contextWindow: 128000,
        pricing: '$10/1M input, $30/1M output'
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Multimodal, fast',
        contextWindow: 128000,
        pricing: '$5/1M input, $15/1M output'
      }
    ],
    configFields: [
      {
        key: 'organization',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'org-...',
        helpText: 'Optional: For organization-specific API usage'
      }
    ],
    pricing: {
      freeTier: false,
      description: 'Pay-as-you-go, requires billing setup'
    },
    documentation: 'https://platform.openai.com/docs'
  },

  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    authType: 'api-key',
    authHeaderName: 'x-api-key',
    requiresVersion: true,
    versionHeaderName: 'anthropic-version',
    defaultModel: 'claude-3-haiku-20240307',
    availableModels: [
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: 'Fastest, most affordable',
        contextWindow: 200000,
        pricing: '$0.25/1M input, $1.25/1M output'
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: 'Best balance of intelligence and speed',
        contextWindow: 200000,
        pricing: '$3/1M input, $15/1M output'
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: 'Most powerful, best for complex tasks',
        contextWindow: 200000,
        pricing: '$15/1M input, $75/1M output'
      }
    ],
    configFields: [
      {
        key: 'version',
        label: 'API Version',
        type: 'select',
        required: true,
        options: [
          { value: '2023-06-01', label: '2023-06-01 (Stable)' },
          { value: '2023-01-01', label: '2023-01-01 (Legacy)' }
        ],
        defaultValue: '2023-06-01',
        helpText: 'Anthropic API version'
      }
    ],
    pricing: {
      freeTier: false,
      description: 'Pay-as-you-go, requires billing setup'
    },
    documentation: 'https://docs.anthropic.com/claude/reference'
  },

  google: {
    name: 'google',
    displayName: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authType: 'url-param',
    defaultModel: 'gemini-1.5-flash',
    availableModels: [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient multimodal model',
        contextWindow: 1000000,
        pricing: 'Free up to 15 RPM'
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable with 2M context window',
        contextWindow: 2000000,
        pricing: 'Free up to 2 RPM, then $1.25/1M tokens'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Stable older model',
        contextWindow: 32768,
        pricing: 'Free tier available'
      }
    ],
    configFields: [
      {
        key: 'projectName',
        label: 'Project Name',
        type: 'text',
        required: false,
        placeholder: 'projects/458660769128',
        helpText: 'Optional: Your Google Cloud project name (e.g., projects/123456789)'
      },
      {
        key: 'projectNumber',
        label: 'Project Number',
        type: 'text',
        required: false,
        placeholder: '458660769128',
        helpText: 'Optional: Your Google Cloud project number'
      }
    ],
    pricing: {
      freeTier: true,
      description: 'Free tier: 15 requests/minute for Flash, 2 requests/minute for Pro'
    },
    documentation: 'https://ai.google.dev/docs'
  },

  cohere: {
    name: 'cohere',
    displayName: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1',
    authType: 'bearer',
    defaultModel: 'command-r',
    availableModels: [
      {
        id: 'command-r',
        name: 'Command R',
        description: 'Retrieval-augmented generation',
        contextWindow: 128000,
        pricing: '$0.50/1M input, $1.50/1M output'
      },
      {
        id: 'command',
        name: 'Command',
        description: 'General purpose',
        contextWindow: 4096,
        pricing: '$1/1M tokens'
      },
      {
        id: 'command-light',
        name: 'Command Light',
        description: 'Faster, lightweight',
        contextWindow: 4096,
        pricing: '$0.30/1M tokens'
      }
    ],
    configFields: [],
    pricing: {
      freeTier: true,
      description: 'Trial key: 1,000 calls/month free'
    },
    documentation: 'https://docs.cohere.com/reference/about'
  }
}

/**
 * Get provider configuration by name
 */
export function getProviderConfig(providerName: string): ProviderConfig | null {
  return PROVIDER_CONFIGS[providerName] || null
}

/**
 * Get all provider names
 */
export function getAllProviderNames(): string[] {
  return Object.keys(PROVIDER_CONFIGS)
}
