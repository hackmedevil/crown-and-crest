'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface ActiveProvider {
    provider: string
    displayName: string
    isActive: boolean
    lastUsed: string | null
    icon: string
}

interface ActiveProvidersStatusProps {
    onRefresh?: () => void
}

export default function ActiveProvidersStatus({ onRefresh }: ActiveProvidersStatusProps) {
    const [providers, setProviders] = useState<ActiveProvider[]>([])
    const [loading, setLoading] = useState(true)

    const fetchActiveProviders = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/ai/status')
            if (response.ok) {
                const data = await response.json()
                setProviders(data.providers || [])
            }
        } catch (error) {
            console.error('Failed to fetch provider status:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchActiveProviders()

        // Refresh every 30 seconds
        const interval = setInterval(fetchActiveProviders, 30000)
        return () => clearInterval(interval)
    }, [])

    const handleRefresh = () => {
        fetchActiveProviders()
        onRefresh?.()
    }

    if (loading && providers.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Active AI Providers</h3>
                    <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
                <p className="text-xs text-gray-500">Loading status...</p>
            </div>
        )
    }

    const activeCount = providers.filter(p => p.isActive).length

    return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <h3 className="text-sm font-bold text-gray-900">Active AI Providers</h3>
                    {activeCount > 0 && (
                        <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
                            {activeCount} Connected
                        </span>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                    title="Refresh status"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Provider List */}
            {providers.length === 0 ? (
                <div className="text-center py-4">
                    <WifiOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No providers configured yet</p>
                    <p className="text-xs text-gray-400 mt-1">Add a provider above to get started</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {providers.map((provider) => (
                        <div
                            key={provider.provider}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${provider.isActive
                                    ? 'bg-white border-green-300 shadow-sm'
                                    : 'bg-gray-50 border-gray-200'
                                }`}
                        >
                            {/* Provider Info */}
                            <div className="flex items-center gap-3">
                                <div className="text-xl">{provider.icon}</div>
                                <div>
                                    <p className={`text-sm font-bold ${provider.isActive ? 'text-green-700' : 'text-gray-500'}`}>
                                        {provider.displayName}
                                    </p>
                                    {provider.lastUsed && (
                                        <p className="text-xs text-gray-500">
                                            Last used: {new Date(provider.lastUsed).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Status Icon */}
                            {provider.isActive ? (
                                <div className="flex items-center gap-1.5 text-green-600">
                                    <Wifi className="w-4 h-4" />
                                    <span className="text-xs font-semibold">Connected</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 text-gray-400">
                                    <WifiOff className="w-4 h-4" />
                                    <span className="text-xs">Inactive</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-green-200">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                        {activeCount > 0 ? (
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                System operational
                            </span>
                        ) : (
                            <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-gray-400" />
                                No active providers
                            </span>
                        )}
                    </span>
                    <span className="text-gray-500">
                        Auto-refresh: 30s
                    </span>
                </div>
            </div>
        </div>
    )
}
