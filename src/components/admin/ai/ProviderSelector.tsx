'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

interface Provider {
    id: string
    name: string
    display_name: string
    icon: string
}

const AVAILABLE_PROVIDERS: Provider[] = [
    { id: 'openai', name: 'openai', display_name: 'OpenAI', icon: '🤖' },
    { id: 'google', name: 'google', display_name: 'Google Gemini', icon: '✨' },
    { id: 'anthropic', name: 'anthropic', display_name: 'Anthropic Claude', icon: '🧠' },
    { id: 'openrouter', name: 'openrouter', display_name: 'OpenRouter', icon: '🔀' },
    { id: 'cohere', name: 'cohere', display_name: 'Cohere', icon: '🎯' },
]

interface ProviderSelectorProps {
    selectedProviders: string[]
    onChange: (providers: string[]) => void
}

export default function ProviderSelector({ selectedProviders, onChange }: ProviderSelectorProps) {
    const toggleProvider = (providerId: string) => {
        if (selectedProviders.includes(providerId)) {
            onChange(selectedProviders.filter(p => p !== providerId))
        } else {
            onChange([...selectedProviders, providerId])
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Select AI Providers</h3>
                <span className="text-xs text-gray-500">
                    {selectedProviders.length} selected
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {AVAILABLE_PROVIDERS.map((provider) => {
                    const isSelected = selectedProviders.includes(provider.name)

                    return (
                        <button
                            key={provider.id}
                            onClick={() => toggleProvider(provider.name)}
                            className={`
                relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                ${isSelected
                                    ? 'border-primary bg-primary/5 shadow-sm'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }
              `}
                        >
                            {/* Selection Indicator */}
                            {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}

                            {/* Provider Icon */}
                            <div className="text-2xl">{provider.icon}</div>

                            {/* Provider Name */}
                            <div className="flex-1 text-left">
                                <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                                    {provider.display_name}
                                </p>
                                <p className="text-xs text-gray-500">{provider.name}</p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {selectedProviders.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">
                    Select at least one provider to continue
                </p>
            )}
        </div>
    )
}
