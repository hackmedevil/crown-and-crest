'use client'

import React, { useEffect, useState } from 'react'
import { Activity, AlertTriangle, Clock, Package, RefreshCw } from 'lucide-react'

interface HealthSummary {
  total_reservations: number
  reserved_count: number
  expired_count: number
  ttl_breach: boolean
  max_minutes_past_ttl: number | null
}

interface StaleOrder {
  order_id: string
  reserved_at: string
  expired_at: string
  minutes_past_ttl: number
}

interface StaleReservation {
  id: string
  order_id: string
  variant_id: string
  reserved_quantity: number
  reserved_at: string
  expires_at: string
  minutes_past_expiry: number
}

interface HealthData {
  summary: HealthSummary
  stale_orders: StaleOrder[]
  stale_reservations: StaleReservation[]
}

export default function InventoryHealthPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchHealthData = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/inventory-reservations/health?limit=50')
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      const data = await response.json()
      setHealthData(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const releaseExpiredReservations = async () => {
    setReleasing(true)
    setActionMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/admin/inventory-reservations/release-expired', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Failed to release expired reservations: ${response.statusText}`)
      }

      const data = await response.json()
      const processed = Number(data?.orders_processed || 0)
      setActionMessage(`Released expired reservations for ${processed} order(s).`)
      await fetchHealthData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to release expired reservations')
    } finally {
      setReleasing(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Inventory Health</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor stock reservations and detect stuck inventory locks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={releaseExpiredReservations}
            disabled={releasing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Clock className={`w-4 h-4 ${releasing ? 'animate-spin' : ''}`} />
            {releasing ? 'Releasing...' : 'Release Expired Now'}
          </button>
          <button
            onClick={fetchHealthData}
            disabled={loading || releasing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Last Refresh */}
      {lastRefresh && (
        <p className="text-xs text-gray-500">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
          <p className="text-sm font-medium">{actionMessage}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <p className="font-semibold">Error loading health data</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && !healthData && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Health Data */}
      {healthData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Reservations</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.summary.total_reservations}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Active Reserved</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.summary.reserved_count}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500">Expired</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.summary.expired_count}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-6 border rounded-lg shadow-sm ${
              healthData.summary.ttl_breach 
                ? 'bg-red-50 border-red-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`w-8 h-8 ${
                  healthData.summary.ttl_breach ? 'text-red-600' : 'text-green-600'
                }`} />
                <div>
                  <p className="text-sm text-gray-500">TTL Status</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.summary.ttl_breach ? 'BREACH' : 'OK'}
                  </p>
                  {healthData.summary.max_minutes_past_ttl !== null && (
                    <p className="text-xs text-gray-600 mt-1">
                      Max: {formatMinutes(healthData.summary.max_minutes_past_ttl)} past TTL
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stale Orders */}
          {healthData.stale_orders.length > 0 && (
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-orange-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  Stale Orders ({healthData.stale_orders.length})
                </h2>
                <p className="text-sm text-gray-600">Orders with expired reservations</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left">Order ID</th>
                      <th className="px-6 py-3 text-left">Reserved At</th>
                      <th className="px-6 py-3 text-left">Expired At</th>
                      <th className="px-6 py-3 text-left">Past TTL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {healthData.stale_orders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {order.order_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatTimestamp(order.reserved_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatTimestamp(order.expired_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                          {formatMinutes(order.minutes_past_ttl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stale Reservations */}
          {healthData.stale_reservations.length > 0 && (
            <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-red-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Stale Reservations ({healthData.stale_reservations.length})
                </h2>
                <p className="text-sm text-gray-600">Reservations past expiry that haven&apos;t been released</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left">Order ID</th>
                      <th className="px-6 py-3 text-left">Variant ID</th>
                      <th className="px-6 py-3 text-left">Quantity</th>
                      <th className="px-6 py-3 text-left">Reserved At</th>
                      <th className="px-6 py-3 text-left">Expires At</th>
                      <th className="px-6 py-3 text-left">Past Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {healthData.stale_reservations.map((reservation) => (
                      <tr key={`${reservation.order_id}-${reservation.variant_id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono text-gray-900">
                          {reservation.order_id}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-600">
                          {reservation.variant_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {reservation.reserved_quantity}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatTimestamp(reservation.reserved_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatTimestamp(reservation.expires_at)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-red-600">
                          {formatMinutes(reservation.minutes_past_expiry)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* All Clear State */}
          {healthData.stale_orders.length === 0 && healthData.stale_reservations.length === 0 && (
            <div className="p-8 bg-green-50 border border-green-200 rounded-lg text-center">
              <Activity className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-semibold text-green-900">All Systems Operational</p>
              <p className="text-sm text-green-700 mt-2">
                No stale reservations detected. Inventory locks are healthy.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
