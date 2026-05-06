"use client"

import { useState } from "react"
import { ExternalLink, CheckCircle2, XCircle, Clock, AlertCircle, Info, Settings2 } from "lucide-react"

type SMSStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED'

interface SMSLog {
  id: string
  order_id: string
  phone: string
  notification_type: string
  message: string
  status: SMSStatus
  error_message?: string | null
  sent_at?: string | null
  created_at: string
}

export default function NotificationsList({ initialLogs }: { initialLogs: SMSLog[] }) {
  const [activeTab, setActiveTab] = useState<'logs' | 'setup'>('logs')

  const formatDateTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }

  const getStatusIcon = (status: SMSStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'SENT':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'PENDING':
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: SMSStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">{getStatusIcon(status)} Delivered</span>
      case 'SENT':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{getStatusIcon(status)} Sent</span>
      case 'FAILED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">{getStatusIcon(status)} Failed</span>
      case 'PENDING':
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">{getStatusIcon(status)} Pending</span>
    }
  }

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-6 px-6 border-b bg-gray-50/50">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Message Logs
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'setup'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          WhatsApp Meta Setup Guide
        </button>
      </div>

      {activeTab === 'logs' ? (
        <div className="overflow-x-auto">
          {initialLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Info className="w-12 h-12 mx-auto mb-3 text-gray-400 opacity-50" />
              <p>No messages have been sent yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b text-gray-500 font-medium whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Recipient</th>
                  <th className="px-6 py-4">Message Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {log.notification_type}
                      {log.order_id && (
                        <div className="text-xs text-gray-500 font-normal mt-0.5">
                          Ord: #{log.order_id.slice(0, 8)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-xs">
                      {log.phone}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md line-clamp-2 text-gray-600">
                        {log.message}
                      </div>
                      {log.error_message && (
                        <div className="mt-1 text-xs text-red-600 flex items-start gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{log.error_message}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="p-8 max-w-4xl space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-2">WhatsApp Meta Cloud API Configuration</h2>
            <p className="text-gray-600">Follow these steps to authorize sending WhatsApp notifications to customers.</p>
          </div>

          <div className="space-y-6">
            <section className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span className="bg-blue-200 text-blue-800 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Environment Variables
              </h3>
              <p className="text-blue-800 text-sm mb-4">Ensure your <code>.env.local</code> contains the following keys. Without these, the notifications will fail silently or display error statuses in the logs.</p>
              
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-blue-400 mb-1"># Enable WhatsApp Provider</div>
                <div>SMS_ENABLED=true</div>
                <div>SMS_PROVIDER=whatsapp-cloud</div>
                <div className="text-blue-400 mt-3 mb-1"># Meta App Credentials</div>
                <div>WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here</div>
                <div>WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here</div>
                <div>WHATSAPP_BUSINESS_ID=your_whatsapp_business_account_id</div>
              </div>
            </section>

            <section className="border rounded-xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="bg-gray-100 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Register Message Templates in Meta Business Manager
              </h3>
              <p className="text-gray-600 text-sm mb-4">WhatsApp requires you to pre-register your transactional templates. You must submit the following templates exactly as defined in Meta Business Manager.</p>
              
              <div className="space-y-4">
                <div className="border border-gray-100 bg-gray-50 rounded-lg p-4">
                  <div className="font-mono text-xs font-bold bg-gray-200 inline-block px-2 py-1 rounded mb-2">order_created</div>
                  <div className="text-sm text-gray-800 mb-2">Category: <span className="font-medium">UTILITY</span> | Language: <span className="font-medium">en</span></div>
                  <pre className="text-xs bg-white p-3 border rounded-md whitespace-pre-wrap font-sans text-gray-600">
Hi {"{{1}}"}, thank you for your order! 🎉

Order ID: {"{{2}}"}
Amount: ₹{"{{3}}"}

We'll keep you updated via WhatsApp.

- Crown & Crest
                  </pre>
                </div>

                <div className="border border-gray-100 bg-gray-50 rounded-lg p-4">
                  <div className="font-mono text-xs font-bold bg-gray-200 inline-block px-2 py-1 rounded mb-2">order_shipped</div>
                  <div className="text-sm text-gray-800 mb-2">Category: <span className="font-medium">UTILITY</span> | Language: <span className="font-medium">en</span></div>
                  <pre className="text-xs bg-white p-3 border rounded-md whitespace-pre-wrap font-sans text-gray-600">
Your order is on the way! 📦

Order: #{"{{1}}"}
Courier: {"{{2}}"}
Tracking: {"{{3}}"}

Track your order: {"{{4}}"}

- Crown & Crest
                  </pre>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                You can find the full list of required templates in <code className="bg-gray-100 px-1 rounded text-gray-700">src/lib/sms/whatsapp-templates.ts</code>. Ensure that the parameter placeholders match exactly.
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
