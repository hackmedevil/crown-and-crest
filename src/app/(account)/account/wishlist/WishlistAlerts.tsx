'use client'

import Link from 'next/link'
import { WishlistAlert, WishlistStats } from '@/types/wishlist'
import { getAlertUrgency } from '@/lib/wishlist/constants'

interface WishlistAlertsProps {
  alerts: WishlistAlert[]
  stats: WishlistStats & { alerts: WishlistAlert[] }
}

export default function WishlistAlerts({ alerts, stats }: WishlistAlertsProps) {
  const highUrgencyAlerts = alerts.filter((a) => getAlertUrgency(a) === 'high')
  const showSummary = highUrgencyAlerts.length > 0

  if (!showSummary) return null

  return (
    <div className="border-b border-black bg-yellow-50">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          {/* Summary */}
          <div>
            {stats.itemsLowStock > 0 && (
              <p className="text-sm font-medium text-gray-900">
                <strong>{stats.itemsLowStock}</strong> {stats.itemsLowStock === 1 ? 'item is' : 'items are'}{' '}
                low in stock
              </p>
            )}
            {stats.itemsPriceDropped > 0 && (
              <p className="text-sm font-medium text-gray-900 mt-1">
                <strong>{stats.itemsPriceDropped}</strong> {stats.itemsPriceDropped === 1 ? 'item has' : 'items have'}{' '}
                a price drop
              </p>
            )}
          </div>

          {/* Individual Alerts */}
          <div className="space-y-2">
            {highUrgencyAlerts.slice(0, 3).map((alert) => (
              <div
                key={`${alert.productId}-${alert.type}`}
                className="flex items-center justify-between bg-white border border-gray-300 p-3"
              >
                <p className="text-xs font-medium text-gray-900">
                  <strong>{alert.productName}</strong> — {alert.message}
                </p>
                {alert.action && (
                  <Link
                    href={alert.action.href}
                    className="ml-3 flex-shrink-0 text-xs font-bold text-black hover:underline"
                  >
                    {alert.action.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Show more indicator */}
            {alerts.length > 3 && (
              <p className="text-xs text-gray-700 text-center py-2">
                +{alerts.length - 3} more {alerts.length - 3 === 1 ? 'alert' : 'alerts'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
