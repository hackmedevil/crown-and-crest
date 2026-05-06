'use client'

import { useState } from 'react'
import { RefreshCw, Database } from 'lucide-react'
import toast from 'react-hot-toast'
import { bulkSyncRazorpayCustomerDetails, fetchRazorpayPaymentLog, syncRazorpayCustomerDetails } from '@/lib/admin/order-actions'

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  time: string
  level: LogLevel
  message: string
}

export default function RazorpayShippingLogger() {
  const [orderId, setOrderId] = useState('')
  const [fetching, setFetching] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [bulkSyncing, setBulkSyncing] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [payload, setPayload] = useState<{
    razorpayOrder?: unknown
    razorpayPayment?: unknown
  } | null>(null)

  const levelClass = (level: LogLevel) => {
    if (level === 'error') return 'text-rose-700'
    if (level === 'warn') return 'text-amber-700'
    return 'text-emerald-700'
  }

  const handleFetch = async () => {
    if (!orderId.trim()) {
      toast.error('Enter an order ID')
      return
    }

    setFetching(true)
    try {
      const result = await fetchRazorpayPaymentLog(orderId.trim())
      setLogs(result.logs || [])

      if (!result.success) {
        setPayload(null)
        toast.error(result.error || 'Failed to fetch Razorpay payload')
        return
      }

      setPayload({
        razorpayOrder: result.razorpayOrder,
        razorpayPayment: result.razorpayPayment,
      })
      toast.success('Razorpay payload fetched')
    } catch {
      toast.error('Failed to fetch Razorpay payload')
    } finally {
      setFetching(false)
    }
  }

  const handleSync = async () => {
    if (!orderId.trim()) {
      toast.error('Enter an order ID')
      return
    }

    setSyncing(true)
    try {
      const result = await syncRazorpayCustomerDetails(orderId.trim())
      setLogs(result.logs || [])

      if (!result.success) {
        toast.error(result.error || 'Failed to sync customer details')
        return
      }

      const fields = result.updatedFields?.join(', ') || 'customer details'
      toast.success(`Synced: ${fields}`)
    } catch {
      toast.error('Failed to sync customer details')
    } finally {
      setSyncing(false)
    }
  }

  const handleBulkSync = async () => {
    setBulkSyncing(true)
    try {
      const result = await bulkSyncRazorpayCustomerDetails(30)
      setLogs(result.logs || [])

      if (!result.success) {
        toast.error('Bulk sync failed')
        return
      }

      toast.success(`Bulk sync complete: ${result.succeeded}/${result.processed}`)
    } catch {
      toast.error('Bulk sync failed')
    } finally {
      setBulkSyncing(false)
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Razorpay Shipping Logger</h2>
        <p className="text-sm text-gray-500">Fetch Razorpay payload and sync missing customer/address details to DB.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          placeholder="Enter internal order ID"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={fetching || syncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
          {fetching ? 'Fetching...' : 'Fetch Razorpay'}
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={fetching || syncing || bulkSyncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          <Database className="h-4 w-4" />
          {syncing ? 'Syncing...' : 'Sync to DB'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleBulkSync}
          disabled={fetching || syncing || bulkSyncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
        >
          <Database className="h-4 w-4" />
          {bulkSyncing ? 'Bulk Syncing...' : 'Bulk Backfill Recent (30)'}
        </button>
        <p className="text-xs text-gray-500">
          Runs customer details sync for recent paid/COD orders missing name, phone, email, or address.
        </p>
      </div>

      {logs.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Logger Output</p>
          <div className="max-h-44 space-y-1 overflow-auto">
            {logs.map((entry, index) => (
              <p key={`${entry.time}-${index}`} className="text-xs">
                <span className="text-gray-400">[{new Date(entry.time).toLocaleTimeString()}]</span>{' '}
                <span className={levelClass(entry.level)}>{entry.level.toUpperCase()}</span>{' '}
                <span className="text-gray-700">{entry.message}</span>
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {payload ? (
        <details>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700">
            View fetched Razorpay payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </details>
      ) : null}
    </section>
  )
}
