'use client'

import { useState } from 'react'
import { RefreshCw, Zap, Loader2, CheckCircle2, XCircle, Clock, Save } from 'lucide-react'
import { useToast } from '@/hooks/useToast'
import type { DiscoveredModel } from '@/types/ai-provider'

interface ModelWithStatus extends DiscoveredModel {
  testStatus?: 'idle' | 'testing' | 'success' | 'failed'
  latency?: number
  priority?: number
  selected?: boolean
}

interface ModelDiscoveryPanelProps {
  onRefresh: () => Promise<Record<string, { models: DiscoveredModel[]; error?: string }>>
  onTestModel: (provider: string, modelId: string) => Promise<{ success: boolean; latency?: number; error?: string }>
  onSavePriority: (provider: string, modelId: string, priority: number) => Promise<{ success: boolean; error?: string }>
  onGetPriorities: (provider: string) => Promise<Record<string, number>>
}

export default function ModelDiscoveryPanel({
  onRefresh,
  onTestModel,
  onSavePriority,
  onGetPriorities
}: ModelDiscoveryPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [models, setModels] = useState<Record<string, ModelWithStatus[]>>({})
  const [error, setError] = useState<string | null>(null)
  const { showSuccess, showError } = useToast()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const results = await onRefresh()
      
      // Transform results and fetch priorities
      const modelsByProvider: Record<string, ModelWithStatus[]> = {}
      
      for (const [provider, result] of Object.entries(results)) {
        if (result.error) {
          setError(`${provider}: ${result.error}`)
          showError(`${provider}: ${result.error}`)
          continue
        }

        // Get saved priorities for this provider
        const priorities = await onGetPriorities(provider)

        modelsByProvider[provider] = result.models.map(model => ({
          ...model,
          testStatus: 'idle' as const,
          priority: priorities[model.id]
        }))
      }

      setModels(modelsByProvider)
      const totalModels = Object.values(modelsByProvider).reduce((sum, arr) => sum + arr.length, 0)
      showSuccess(`Discovered ${totalModels} models from ${Object.keys(modelsByProvider).length} provider(s)`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Refresh failed'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTestModel = async (provider: string, modelId: string) => {
    // Update status to testing
    setModels(prev => ({
      ...prev,
      [provider]: prev[provider]?.map(m =>
        m.id === modelId ? { ...m, testStatus: 'testing' as const } : m
      ) || []
    }))

    try {
      const result = await onTestModel(provider, modelId)

      // Update with result
      setModels(prev => ({
        ...prev,
        [provider]: prev[provider]?.map(m =>
          m.id === modelId
            ? {
                ...m,
                testStatus: result.success ? 'success' as const : 'failed' as const,
                latency: result.latency
              }
            : m
        ) || []
      }))

      if (result.success) {
        showSuccess(`✓ ${modelId} is working (${result.latency}ms)`)
      } else {
        showError(`✗ ${modelId} test failed: ${result.error}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Test failed'
      setModels(prev => ({
        ...prev,
        [provider]: prev[provider]?.map(m =>
          m.id === modelId ? { ...m, testStatus: 'failed' as const } : m
        ) || []
      }))
      showError(`Test failed: ${errorMsg}`)
    }
  }

  const handleTestAll = async (provider: string) => {
    showSuccess(`🧪 Testing all models...`)

    // Test all models
    for (const model of Object.values(models[provider] || [])) {
      await handleTestModel(provider, model.id)
      // Wait 1.5s between tests to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1500))
    }

    // After all tests complete, fetch fresh state and rank
    setModels(prev => {
      const currentModels = prev[provider] || []
      
      // Count results
      const successCount = currentModels.filter(m => m.testStatus === 'success').length
      const failCount = currentModels.filter(m => m.testStatus === 'failed').length

      // Sort: success first (ascending latency), then failed
      const sortedModels = [...currentModels].sort((a, b) => {
        // Success models first
        if (a.testStatus === 'success' && b.testStatus !== 'success') return -1
        if (a.testStatus !== 'success' && b.testStatus === 'success') return 1
        
        // Within success, sort by latency (lowest first)
        if (a.testStatus === 'success' && b.testStatus === 'success') {
          return (a.latency || 999999) - (b.latency || 999999)
        }

        // Failed models at end
        return 0
      })

      // Auto-select top 5 working models
      const topWorkingModels = sortedModels
        .filter(m => m.testStatus === 'success')
        .slice(0, 5)

      const updatedModels = sortedModels.map(m => ({
        ...m,
        selected: topWorkingModels.some(tm => tm.id === m.id)
      }))

      showSuccess(`✅ Test complete: ${successCount} working, ${failCount} failed. Top ${topWorkingModels.length} models selected.`)

      return {
        ...prev,
        [provider]: updatedModels
      }
    })
  }

  const handlePriorityChange = async (provider: string, modelId: string, priority: number) => {
    // Optimistically update
    setModels(prev => ({
      ...prev,
      [provider]: prev[provider]?.map(m =>
        m.id === modelId ? { ...m, priority } : m
      ) || []
    }))

    try {
      const result = await onSavePriority(provider, modelId, priority)
      if (!result.success) {
        console.error('Failed to save priority:', result.error)
        showError(`Failed to save priority: ${result.error}`)
        // Revert on error
        setModels(prev => ({
          ...prev,
          [provider]: prev[provider]?.map(m =>
            m.id === modelId ? { ...m, priority: undefined } : m
          ) || []
        }))
      } else {
        console.log(`✓ Priority ${priority} saved for ${modelId}`)
        showSuccess(`Priority ${priority} saved for ${modelId}`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Exception saving priority:', err)
      setError(`Error: ${errorMsg}`)
      showError(`Error: ${errorMsg}`)
      // Revert on error
      setModels(prev => ({
        ...prev,
        [provider]: prev[provider]?.map(m =>
          m.id === modelId ? { ...m, priority: undefined } : m
        ) || []
      }))
    }
  }

  const handleToggleSelection = (provider: string, modelId: string) => {
    setModels(prev => ({
      ...prev,
      [provider]: prev[provider]?.map(m =>
        m.id === modelId ? { ...m, selected: !m.selected } : m
      ) || []
    }))
  }

  const handleSaveSelected = async (provider: string) => {
    const providerModels = models[provider] || []
    const selectedModels = providerModels.filter(m => m.selected)

    console.log(`[Save] Selected models for ${provider}:`, selectedModels.map(m => m.id))

    if (selectedModels.length === 0) {
      showError('Please select at least one model to save')
      return
    }

    try {
      let savedCount = 0
      // Save with priority order (1, 2, 3, ...)
      for (let i = 0; i < selectedModels.length; i++) {
        const result = await onSavePriority(provider, selectedModels[i].id, i + 1)
        if (result.success) {
          savedCount++
          console.log(`[Save] ✓ Saved ${selectedModels[i].id} with priority ${i + 1}`)
        } else {
          showError(`Failed to save ${selectedModels[i].id}: ${result.error}`)
          console.error(`[Save] ✗ Failed to save ${selectedModels[i].id}:`, result.error)
        }
      }

      if (savedCount === selectedModels.length) {
        showSuccess(`✓ Saved ${savedCount} selected models as top priorities`)
      } else {
        showSuccess(`✓ Saved ${savedCount} of ${selectedModels.length} models`)
      }

      // Refresh to update priorities
      const result = await onGetPriorities(provider)
      setModels(prev => ({
        ...prev,
        [provider]: prev[provider]?.map(m => ({
          ...m,
          priority: result[m.id],
          selected: false  // Uncheck after save
        })) || []
      }))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Save failed'
      console.error('[Save] Exception:', err)
      showError(`Failed to save: ${errorMsg}`)
    }
  }

  const totalModels = Object.values(models).reduce((sum, arr) => sum + arr.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Model Discovery & Testing</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              1️⃣ Click "Refresh Models" to discover all available models • 2️⃣ Click "Test All" to test all models and auto-rank by performance • 3️⃣ Check boxes to select top working models • 4️⃣ Click "Save Selected Models" to use them for AI operations
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all
              ${isRefreshing
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'}
            `}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh Models
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {totalModels > 0 && (
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
            <span className="font-bold">{totalModels} models discovered</span>
            <span>•</span>
            <span>{Object.keys(models).length} providers</span>
          </div>
        )}
      </div>

      {/* Model Lists by Provider */}
      {Object.keys(models).length > 0 && (
        <div className="space-y-6">
          {Object.entries(models).map(([provider, providerModels]) => (
            <div key={provider} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-gray-900 capitalize">
                      {provider} Models ({providerModels.length})
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {providerModels.filter(m => m.selected).length} selected • {providerModels.filter(m => m.testStatus === 'success').length} working
                    </p>
                  </div>
                  <button
                    onClick={() => handleTestAll(provider)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Test All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {providerModels.map((model) => (
                  <div key={model.id} className={`px-6 py-4 hover:bg-gray-50 transition-colors ${model.selected ? 'bg-blue-50 border-l-4 border-primary' : ''}`}>
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={model.selected || false}
                        onChange={() => {
                          console.log(`[Checkbox] Toggling ${model.id}, current state:`, model.selected)
                          handleToggleSelection(provider, model.id)
                        }}
                        disabled={model.testStatus !== 'success'}
                        className="mt-1 w-5 h-5 rounded cursor-pointer border-2 border-gray-300 accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        title={model.testStatus !== 'success' ? 'Test must pass to select' : 'Click to select'}
                      />

                      {/* Model Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-bold text-gray-900 truncate">{model.name}</h5>
                          {model.tier === 'free' && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded">
                              FREE
                            </span>
                          )}
                          {model.selected && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                              Priority {model.priority || '?'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{model.id}</p>
                        <p className="text-sm text-gray-600 line-clamp-1">{model.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{model.pricing}</span>
                          {model.contextWindow && (
                            <>
                              <span>•</span>
                              <span>{(model.contextWindow / 1000).toFixed(0)}K context</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Test Status */}
                      <div className="flex items-center gap-3">
                        {model.testStatus === 'testing' && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Testing...</span>
                          </div>
                        )}
                        {model.testStatus === 'success' && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{model.latency}ms</span>
                          </div>
                        )}
                        {model.testStatus === 'failed' && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>Failed</span>
                          </div>
                        )}

                        {model.testStatus === 'idle' && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>Not tested</span>
                          </div>
                        )}
                      </div>

                      {/* Test Button */}
                      <button
                        onClick={() => handleTestModel(provider, model.id)}
                        disabled={model.testStatus === 'testing'}
                        className={`
                          p-2 rounded-lg transition-colors flex-shrink-0
                          ${model.testStatus === 'testing'
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}
                        `}
                        title="Test model"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save Selected Button */}
              {providerModels.filter(m => m.selected).length > 0 && (
                <div className="bg-blue-50 px-6 py-4 border-t border-gray-200">
                  <button
                    onClick={() => handleSaveSelected(provider)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold bg-primary text-white hover:bg-primary/90 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save {providerModels.filter(m => m.selected).length} Selected Models
                  </button>
                  <p className="text-xs text-gray-600 mt-2">
                    Selected models will be prioritized for AI operations. Only working (✓) models can be selected.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {Object.keys(models).length === 0 && !isRefreshing && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No Models Discovered</h3>
          <p className="text-sm text-gray-500">
            Click "Refresh Models" to discover available models from your configured providers
          </p>
        </div>
      )}
    </div>
  )
}
