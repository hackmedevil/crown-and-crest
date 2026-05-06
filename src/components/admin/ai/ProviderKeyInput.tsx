'use client'

import { Eye, EyeOff, Shield } from 'lucide-react'
import { useState } from 'react'

interface ProviderKeyInputProps {
    provider: string
    displayName: string
    value: string
    onChange: (value: string) => void
    onVerify: () => void
    isVerifying: boolean
    isVerified: boolean
    error?: string
}

export default function ProviderKeyInput({
    provider,
    displayName,
    value,
    onChange,
    onVerify,
    isVerifying,
    isVerified,
    error
}: ProviderKeyInputProps) {
    const [showKey, setShowKey] = useState(false)

    const getPlaceholder = (provider: string) => {
        switch (provider) {
            case 'openai':
                return 'sk-...'
            case 'anthropic':
                return 'sk-ant-...'
            case 'google':
                return 'AIza...'
            default:
                return 'Enter API key'
        }
    }

    const getKeyPrefix = (provider: string) => {
        switch (provider) {
            case 'openai':
                return 'sk-'
            case 'anthropic':
                return 'sk-ant-'
            case 'google':
                return 'AIza'
            default:
                return ''
        }
    }

    const isValidFormat = () => {
        if (!value) return false
        const prefix = getKeyPrefix(provider)
        return prefix ? value.startsWith(prefix) : value.length >= 20
    }

    return (
        <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-bold text-gray-900">{displayName} Configuration</h4>
                </div>
                {isVerified && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                        Verified
                    </span>
                )}
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                    API Key <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={getPlaceholder(provider)}
                        className={`
              w-full pl-4 pr-20 py-2.5 rounded-lg border font-mono text-sm
              focus:outline-none focus:ring-2 transition-all
              ${error
                                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50'
                                : isVerified
                                    ? 'border-green-300 focus:ring-green-500/20 focus:border-green-500 bg-white'
                                    : 'border-gray-300 focus:ring-primary/20 focus:border-primary bg-white'
                            }
            `}
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={onVerify}
                        disabled={!value || isVerifying || isVerified}
                        className={`
              absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded text-xs font-semibold
              transition-all
              ${!value || isVerifying || isVerified
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isValidFormat()
                                    ? 'bg-primary text-white hover:bg-primary/90'
                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                            }
            `}
                    >
                        {isVerifying ? 'Verifying...' : isVerified ? 'Verified' : 'Verify'}
                    </button>
                </div>

                {/* Feedback Messages */}
                {error && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-red-600"></span>
                        {error}
                    </p>
                )}
                {!error && value && !isValidFormat() && !isVerified && (
                    <p className="text-xs text-yellow-600 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-yellow-600"></span>
                        Key format doesn't match expected pattern for {displayName}
                    </p>
                )}
                {!error && !value && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        API key will be encrypted with AES-256-GCM before storage
                    </p>
                )}
            </div>
        </div>
    )
}
