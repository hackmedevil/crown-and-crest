'use client'

import { useState } from 'react'
import { Send, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle, Wrench } from 'lucide-react'
import toast from 'react-hot-toast'

interface SendSMSButtonProps {
    orderId: string
    hasPhone: boolean
}

interface DiagnosticsData {
    sms_enabled: boolean
    provider: string
    health_status: string
    issues: string[]
    warnings: string[]
    provider_configs: any
    whatsapp_api_test?: any
    required_templates?: string[]
}

const NOTIFICATION_TYPES = [
    { value: 'ORDER_CREATED', label: 'Order Created' },
    { value: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed' },
    { value: 'COD_CONFIRMED', label: 'COD Confirmed' },
    { value: 'ORDER_PACKED', label: 'Order Packed' },
    { value: 'SHIPPED', label: 'Shipped' },
    { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
    { value: 'DELIVERED', label: 'Delivered' },
    { value: 'CANCELLED', label: 'Cancelled' },
]

export default function SendSMSButton({ orderId, hasPhone }: SendSMSButtonProps) {
    const [showModal, setShowModal] = useState(false)
    const [selectedType, setSelectedType] = useState('SHIPPED')
    const [customMessage, setCustomMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [smsHistory, setSmsHistory] = useState<any[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)
    const [loadingDiagnostics, setLoadingDiagnostics] = useState(false)
    const [showDiagnostics, setShowDiagnostics] = useState(false)
    const [testingSMS, setTestingSMS] = useState(false)

    if (!hasPhone) {
        return (
            <div className="text-sm text-gray-500 italic">
                No customer phone number available
            </div>
        )
    }

    const loadDiagnostics = async () => {
        setLoadingDiagnostics(true)
        try {
            const response = await fetch('/api/admin/sms/diagnostics')
            const data = await response.json()

            if (response.ok) {
                setDiagnostics(data)
                setShowDiagnostics(true)
            } else {
                toast.error('Failed to load diagnostics')
            }
        } catch (error) {
            toast.error('Failed to load diagnostics')
        } finally {
            setLoadingDiagnostics(false)
        }
    }

    const handleTestSMS = async () => {
        setTestingSMS(true)
        try {
            const response = await fetch('/api/admin/whatsapp/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: '919905447414', // Test number from Meta
                    message: `🧪 Test message from Crown & Crest Admin!\n\nIf you received this, WhatsApp integration is working correctly! ✅`,
                }),
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('Test SMS sent! Check WhatsApp.')
            } else {
                toast.error(`Error: ${data.error}`)
                console.log('WhatsApp Error Details:', data.details)
            }
        } catch (error: unknown) {
            toast.error('Failed to send test SMS')
        } finally {
            setTestingSMS(false)
        }
    }

    const handleSendSMS = async () => {
        setIsSending(true)
        try {
            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: orderId,
                    notification_type: selectedType,
                    custom_message: customMessage || undefined,
                }),
            })

            const data = await response.json()

            if (response.ok && data.success) {
                toast.success('SMS sent successfully!')
                setShowModal(false)
                setCustomMessage('')
                // Refresh history if it's visible
                if (showHistory) {
                    await loadSMSHistory()
                }
            } else {
                throw new Error(data.error || 'Failed to send SMS')
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS'
            toast.error(errorMessage)
        } finally {
            setIsSending(false)
        }
    }

    const loadSMSHistory = async () => {
        setLoadingHistory(true)
        try {
            const response = await fetch(`/api/sms/send?order_id=${orderId}`)
            const data = await response.json()

            if (response.ok && data.success) {
                setSmsHistory(data.data)
                setShowHistory(true)
            } else {
                throw new Error('Failed to load SMS history')
            }
        } catch (error) {
            toast.error('Failed to load SMS history')
        } finally {
            setLoadingHistory(false)
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SENT':
            case 'DELIVERED':
                return <CheckCircle className="w-4 h-4 text-green-600" />
            case 'FAILED':
                return <XCircle className="w-4 h-4 text-red-600" />
            default:
                return <Clock className="w-4 h-4 text-yellow-600" />
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm"
                >
                    <Send className="w-4 h-4" />
                    Send SMS Notification
                </button>

                <button
                    onClick={loadSMSHistory}
                    disabled={loadingHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-semibold text-sm"
                >
                    <MessageSquare className="w-4 h-4" />
                    {loadingHistory ? 'Loading...' : 'SMS History'}
                </button>

                <button
                    onClick={handleTestSMS}
                    disabled={testingSMS}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-semibold text-sm"
                    title="Send test message to verify WhatsApp is working"
                >
                    <Send className="w-4 h-4" />
                    {testingSMS ? 'Sending...' : 'Test WhatsApp'}
                </button>

                <button
                    onClick={loadDiagnostics}
                    disabled={loadingDiagnostics}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 font-semibold text-sm"
                >
                    <Wrench className="w-4 h-4" />
                    {loadingDiagnostics ? 'Loading...' : 'Diagnostics'}
                </button>
            </div>

            {/* SMS History */}
            {showHistory && smsHistory.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">SMS History</h4>
                    <div className="space-y-2">
                        {smsHistory.map((sms) => (
                            <div key={sms.id} className="bg-white rounded-md p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-700">
                                        {sms.notification_type.replace(/_/g, ' ')}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(sms.status)}
                                        <span className="text-xs text-gray-500">
                                            {new Date(sms.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600">{sms.message}</p>
                                {sms.error_message && (
                                    <p className="text-xs text-red-600 mt-1">Error: {sms.error_message}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showHistory && smsHistory.length === 0 && (
                <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-500">
                    No SMS sent yet for this order
                </div>
            )}

            {/* Send SMS Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            Send SMS Notification
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notification Type
                                </label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    {NOTIFICATION_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Custom Message (Optional)
                                </label>
                                <textarea
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                    placeholder="Leave empty to use default template"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    If provided, this will override the default template
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end mt-6">
                            <button
                                onClick={() => {
                                    setShowModal(false)
                                    setCustomMessage('')
                                }}
                                disabled={isSending}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-semibold text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendSMS}
                                disabled={isSending}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSending ? (
                                    'Sending...'
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send SMS
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Diagnostics Modal */}
            {showDiagnostics && diagnostics && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Wrench className="w-5 h-5" />
                                SMS & WhatsApp Diagnostics
                            </h3>
                            <button
                                onClick={() => setShowDiagnostics(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Health Status */}
                            <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                                <div className="flex items-center gap-2">
                                    {diagnostics.health_status.includes('OK') ? (
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                    )}
                                    <span className="font-semibold text-gray-900">
                                        {diagnostics.health_status}
                                    </span>
                                </div>
                            </div>

                            {/* Configuration */}
                            <div>
                                <h4 className="font-semibold text-sm text-gray-900 mb-2">Configuration</h4>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">SMS Enabled:</span>
                                        <span className={diagnostics.sms_enabled ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                                            {diagnostics.sms_enabled ? '✓ Yes' : '✗ No'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Provider:</span>
                                        <span className="font-mono text-gray-900">{diagnostics.provider}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Provider Config */}
                            {diagnostics.provider_configs && (
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                        {diagnostics.provider.toUpperCase()} Configuration
                                    </h4>
                                    <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                        {Object.entries(diagnostics.provider_configs[diagnostics.provider] || {}).map(
                                            ([key, value]: [string, any]) => (
                                                <div key={key} className="flex justify-between">
                                                    <span className="text-gray-600 capitalize">
                                                        {key.replace(/_/g, ' ')}:
                                                    </span>
                                                    <span className="font-mono text-xs">{String(value)}</span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* WhatsApp API Test */}
                            {diagnostics.whatsapp_api_test && (
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-900 mb-2">WhatsApp API Test</h4>
                                    <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                                        {Object.entries(diagnostics.whatsapp_api_test).map(
                                            ([key, value]: [string, any]) => (
                                                <div key={key} className="flex justify-between">
                                                    <span className="text-gray-600 capitalize">
                                                        {key.replace(/_/g, ' ')}:
                                                    </span>
                                                    <span className="font-mono text-xs text-gray-900">
                                                        {String(value)}
                                                    </span>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Issues */}
                            {diagnostics.issues && diagnostics.issues.length > 0 && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <h4 className="font-semibold text-sm text-red-900 mb-2 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" />
                                        Issues Found
                                    </h4>
                                    <ul className="text-sm text-red-700 space-y-1">
                                        {diagnostics.issues.map((issue, i) => (
                                            <li key={i}>• {issue}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {diagnostics.warnings && diagnostics.warnings.length > 0 && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <h4 className="font-semibold text-sm text-yellow-900 mb-2">Warnings</h4>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        {diagnostics.warnings.map((warning, i) => (
                                            <li key={i}>⚠️ {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Required Templates */}
                            {diagnostics.required_templates && (
                                <div>
                                    <h4 className="font-semibold text-sm text-gray-900 mb-2">
                                        Required WhatsApp Templates
                                    </h4>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        {diagnostics.required_templates.map((template, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                    {template}
                                                </code>
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-xs text-gray-500 mt-2">
                                        These templates must be created and approved in Meta Business Manager
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 justify-end mt-6">
                            <button
                                onClick={() => setShowDiagnostics(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-semibold text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
