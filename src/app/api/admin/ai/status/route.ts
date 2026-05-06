import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

const PROVIDER_ICONS: Record<string, string> = {
  openai: '🤖',
  google: '✨',
  anthropic: '🧠',
  openrouter: '🔀',
  cohere: '🎯',
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: 'OpenAI',
  google: 'Google Gemini',
  anthropic: 'Anthropic Claude',
  openrouter: 'OpenRouter',
  cohere: 'Cohere',
}

export async function GET() {
  try {
    await requireAdmin()

    // Fetch all providers with their API keys (including inactive)
    const { data: allProviders, error: providersError } = await supabaseAdmin
      .from('ai_providers')
      .select(`
        name,
        display_name,
        is_active
      `)

    if (providersError) {
      console.error('[Status API] Providers query error:', providersError)
      return NextResponse.json({ providers: [] })
    }

    // Fetch all active API keys
    const { data: apiKeys, error: keysError } = await supabaseAdmin
      .from('ai_api_keys')
      .select(`
        provider_id,
        is_active,
        last_used_at,
        ai_providers!inner (
          name
        )
      `)
      .eq('is_active', true)

    if (keysError) {
      console.error('[Status API] Keys query error:', keysError)
    }

    // Create a map of provider names to their key data
    const providerKeysMap = new Map()
    if (apiKeys) {
      apiKeys.forEach((key: any) => {
        const providerName = key.ai_providers?.name
        if (providerName) {
          providerKeysMap.set(providerName, {
            isActive: key.is_active,
            lastUsed: key.last_used_at
          })
        }
      })
    }

    // Transform data for display
    const activeProviders = (allProviders || []).map((p: any) => {
      const keyData = providerKeysMap.get(p.name)
      return {
        provider: p.name,
        displayName: PROVIDER_DISPLAY_NAMES[p.name] || p.display_name,
        isActive: !!(keyData?.isActive && p.is_active),
        lastUsed: keyData?.lastUsed || null,
        icon: PROVIDER_ICONS[p.name] || '🔧',
      }
    }).filter((p: any) => providerKeysMap.has(p.provider)) // Only show providers with keys

    return NextResponse.json({ 
      providers: activeProviders,
      totalActive: activeProviders.filter((p: any) => p.isActive).length
    })
  } catch (error) {
    console.error('[Status API] Error:', error)
    return NextResponse.json({ providers: [] }, { status: 500 })
  }
}
