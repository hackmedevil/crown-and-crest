'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Info, AlertCircle } from 'lucide-react'
import type { LogMessage } from '@/types/ai-provider'

interface VerificationLogProps {
    messages: LogMessage[]
    isRunning: boolean
    onClear?: () => void
}

export default function VerificationLog({ messages, isRunning, onClear }: VerificationLogProps) {
    const logEndRef = useRef<HTMLDivElement>(null)
    const [autoscroll, setAutoscroll] = useState(true)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (autoscroll && logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, autoscroll])

    const getIcon = (level: LogMessage['level'], icon?: string) => {
        if (icon) return icon

        switch (level) {
            case 'success':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />
            case 'warning':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />
            default:
                return <Info className="w-4 h-4 text-blue-500" />
        }
    }

    const getTextColor = (level: LogMessage['level']) => {
        switch (level) {
            case 'success':
                return 'text-green-700'
            case 'error':
                return 'text-red-700'
            case 'warning':
                return 'text-yellow-700'
            default:
                return 'text-gray-700'
        }
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                    <h3 className="text-sm font-bold text-gray-900">Verification Log</h3>
                    {isRunning && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-600">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Running...
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={autoscroll}
                            onChange={(e) => setAutoscroll(e.target.checked)}
                            className="w-3 h-3 rounded border-gray-300"
                        />
                        Auto-scroll
                    </label>
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Log Content */}
            <div className="h-64 overflow-y-auto bg-gray-900 font-mono text-xs">
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>No logs yet. Click "Verify" to start...</p>
                    </div>
                ) : (
                    <div className="p-3 space-y-1">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex items-start gap-2 ${msg.level === 'error' ? 'bg-red-900/20' : ''
                                    } ${msg.level === 'success' ? 'bg-green-900/20' : ''
                                    } px-2 py-1 rounded`}
                            >
                                {/* Timestamp */}
                                <span className="text-gray-500 shrink-0">
                                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                                        hour12: false,
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit'
                                    })}
                                </span>

                                {/* Icon */}
                                <span className="shrink-0 mt-0.5">
                                    {typeof msg.icon === 'string' ? (
                                        <span>{msg.icon}</span>
                                    ) : (
                                        getIcon(msg.level, msg.icon)
                                    )}
                                </span>

                                {/* Message */}
                                <span className={`flex-1 ${getTextColor(msg.level)}`}>
                                    {msg.message}
                                </span>
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                    {messages.length} {messages.length === 1 ? 'entry' : 'entries'}
                </span>
                {isRunning && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></div>
                        Processing...
                    </span>
                )}
            </div>
        </div>
    )
}
