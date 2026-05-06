'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmationDialogProps {
    isOpen: boolean
    title: string
    message: string
    variant: 'warning' | 'danger'
    options: {
        label: string
        action: () => void
        variant: 'primary' | 'danger' | 'secondary'
    }[]
    onClose: () => void
}

/**
 * DELETION CONFIRMATION DIALOGS
 * 
 * Core behavior:
 * - No default choice
 * - No silent action
 * - Clear explanation of consequences
 * - Options for granular control
 */
export default function ConfirmationDialog({
    isOpen,
    title,
    message,
    variant,
    options,
    onClose
}: ConfirmationDialogProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full overflow-hidden shadow-xl">
                {/* Header */}
                <div className={`flex items-start gap-3 p-6 ${variant === 'danger' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                        <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
                    </div>
                    <div className="flex-1 pt-1">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="mt-2 text-sm text-gray-600">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 p-1 hover:bg-white/50 rounded"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Actions */}
                <div className="p-6 space-y-2">
                    {options.map((option, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                option.action()
                                onClose()
                            }}
                            className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${option.variant === 'danger'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : option.variant === 'primary'
                                        ? 'bg-gray-900 text-white hover:bg-gray-800'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
