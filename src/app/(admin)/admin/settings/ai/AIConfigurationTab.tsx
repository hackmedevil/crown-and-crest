'use client'

import { useState } from 'react'
import { Sparkles, Loader2, CheckCircle2, Save } from 'lucide-react'
import ProviderSelector from '@/components/admin/ai/ProviderSelector'
import ProviderKeyInput from '@/components/admin/ai/ProviderKeyInput'
import VerificationLog from '@/components/admin/ai/VerificationLog'
import ActiveProvidersStatus from '@/components/admin/ai/ActiveProvidersStatus'
import ModelDiscoveryPanel from '@/components/admin/ai/ModelDiscoveryPanel'
import { 
    verifyProviderFull, 
    saveProviderConfiguration,
    refreshAllModels,
    testProviderModel,
    saveModelPriority,
    getModelPriorities
} from './actions'
import type { LogMessage } from '@/types/ai-provider'

interface ProviderState {
    apiKey: string
    isVerifying: boolean
    isVerified: boolean
    isDiscovered: boolean
    error?: string
    models?: any[]
}

export default function AIConfigurationTab() {
    const [selectedProviders, setSelectedProviders] = useState<string[]>([])
    const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>({})
    const [logs, setLogs] = useState<LogMessage[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [statusKey, setStatusKey] = useState(0) // For refreshing status display

    const addLog = (level: LogMessage['level'], message: string, icon?: string) => {
        setLogs((prev) => [...prev, {
            timestamp: new Date().toISOString(),
            level,
            message,
            icon
        }])
    }

    const handleProviderChange = (providers: string[]) => {
        setSelectedProviders(providers)
        // Initialize state for new providers
        providers.forEach(p => {
            if (!providerStates[p]) {
                setProviderStates(prev => ({
                    ...prev,
                    [p]: {
                        apiKey: '',
                        isVerifying: false,
                        isVerified: false,
                        isDiscovered: false
                    }
                }))
            }
        })
    }

    const handleKeyChange = (provider: string, value: string) => {
        setProviderStates(prev => ({
            ...prev,
            [provider]: {
                ...prev[provider],
                apiKey: value,
                isVerified: false,
                isDiscovered: false,
                error: undefined
            }
        }))
    }

    const handleVerify = async (provider: string) => {
        const state = providerStates[provider]
        if (!state?.apiKey) return

        setProviderStates(prev => ({
            ...prev,
            [provider]: { ...prev[provider], isVerifying: true, error: undefined }
        }))

        setIsRunning(true)
        addLog('info', `🔄 Starting verification for ${provider}...`, '🔄')

        try {
            const result = await verifyProviderFull(provider, state.apiKey)

            // Log each step
            result.steps.forEach(step => {
                const icon = step.status === 'success' ? '✓' : step.status === 'error' ? '✗' : '🔄'
                const level = step.status === 'success' ? 'success' : step.status === 'error' ? 'error' : 'info'
                addLog(level, `${icon} ${step.message}`, icon)
            })

            if (result.success) {
                setProviderStates(prev => ({
                    ...prev,
                    [provider]: {
                        ...prev[provider],
                        isVerifying: false,
                        isVerified: true,
                        isDiscovered: true,
                        models: result.models
                    }
                }))
                addLog('success', `✅ ${provider} verification complete! Found ${result.models?.length || 0} models`, '✅')
            } else {
                setProviderStates(prev => ({
                    ...prev,
                    [provider]: {
                        ...prev[provider],
                        isVerifying: false,
                        isVerified: false,
                        error: result.error
                    }
                }))
                addLog('error', `❌ ${provider} verification failed: ${result.error}`, '❌')
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            setProviderStates(prev => ({
                ...prev,
                [provider]: {
                    ...prev[provider],
                    isVerifying: false,
                    error: errorMsg
                }
            }))
            addLog('error', `❌ Error: ${errorMsg}`, '❌')
        } finally {
            setIsRunning(false)
        }
    }

    const handleSaveAll = async () => {
        setIsSaving(true)
        addLog('info', '💾 Saving configurations...', '💾')

        try {
            let savedCount = 0
            for (const provider of selectedProviders) {
                const state = providerStates[provider]
                if (state?.isVerified && state.apiKey) {
                    const result = await saveProviderConfiguration({
                        provider,
                        apiKey: state.apiKey,
                        label: 'Default',
                        models: state.models?.map(m => m.id)
                    })

                    if (result.success) {
                        savedCount++
                        addLog('success', `✓ Saved ${provider}`, '✓')
                    } else {
                        addLog('error', `✗ Failed to save ${provider}: ${result.error}`, '✗')
                    }
                }
            }

            if (savedCount > 0) {
                addLog('success', `✅ Successfully saved ${savedCount} provider(s)`, '✅')
                // Refresh status display after a short delay to allow DB writes to complete
                setTimeout(() => setStatusKey(prev => prev + 1), 500)
            }
        } catch (error) {
            addLog('error', `❌ Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`, '❌')
        } finally {
            setIsSaving(false)
        }
    }

    const canSave = selectedProviders.some(p => providerStates[p]?.isVerified)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-primary/10 via-purple-50 to-pink-50 rounded-xl p-6 border border-primary/20">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">AI Provider Management</h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Configure multiple AI providers with encrypted key storage and live verification.
                            The system supports OpenAI, Google Gemini, Anthropic Claude, OpenRouter, and Cohere.
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Provider Status */}
            <ActiveProvidersStatus key={statusKey} onRefresh={() => setStatusKey(prev => prev + 1)} />

            {/* Model Discovery & Testing Panel */}
            <ModelDiscoveryPanel
                onRefresh={async () => {
                    const result = await refreshAllModels()
                    if (!result.success) {
                        throw new Error(result.error || 'Refresh failed')
                    }
                    return result.results || {}
                }}
                onTestModel={async (provider, modelId) => {
                    const result = await testProviderModel(provider, modelId)
                    return result
                }}
                onSavePriority={async (provider, modelId, priority) => {
                    const result = await saveModelPriority(provider, modelId, priority)
                    return result
                }}
                onGetPriorities={async (provider) => {
                    const result = await getModelPriorities(provider)
                    return result.priorities || {}
                }}
            />

            {/* Provider Selection */}
            <ProviderSelector
                selectedProviders={selectedProviders}
                onChange={handleProviderChange}
            />

            {/* Configuration Forms */}
            {selectedProviders.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">Provider Configuration</h3>
                    {selectedProviders.map(provider => {
                        const state = providerStates[provider] || {
                            apiKey: '',
                            isVerifying: false,
                            isVerified: false,
                            isDiscovered: false
                        }

                        return (
                            <ProviderKeyInput
                                key={provider}
                                provider={provider}
                                displayName={provider.charAt(0).toUpperCase() + provider.slice(1)}
                                value={state.apiKey}
                                onChange={(value) => handleKeyChange(provider, value)}
                                onVerify={() => handleVerify(provider)}
                                isVerifying={state.isVerifying}
                                isVerified={state.isVerified}
                                error={state.error}
                            />
                        )
                    })}
                </div>
            )}

            {/* Verification Log */}
            {selectedProviders.length > 0 && (
                <VerificationLog
                    messages={logs}
                    isRunning={isRunning}
                    onClear={() => setLogs([])}
                />
            )}

            {/* Save Button */}
            {selectedProviders.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="text-sm">
                        <p className="font-bold text-gray-900">Ready to save?</p>
                        <p className="text-xs text-gray-500">
                            {canSave
                                ? 'All verified providers will be saved with encrypted keys'
                                : 'Verify at least one provider to enable saving'}
                        </p>
                    </div>
                    <button
                        onClick={handleSaveAll}
                        disabled={!canSave || isSaving}
                        className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all
              ${canSave && !isSaving
                                ? 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : canSave ? (
                            <>
                                <Save className="w-4 h-4" />
                                Save All Configurations
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                Verify Providers First
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Empty State */}
            {selectedProviders.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Providers Selected</h3>
                    <p className="text-sm text-gray-500">
                        Select one or more AI providers above to get started
                    </p>
                </div>
            )}
        </div>
    )
}
