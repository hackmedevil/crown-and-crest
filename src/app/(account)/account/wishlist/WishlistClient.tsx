'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import WishlistProductCard from './WishlistProductCard'
import WishlistEmptyState from './WishlistEmptyState'
import WishlistAlerts from './WishlistAlerts'
import WishlistRecommendations from './WishlistRecommendations'
import { WishlistItemWithProduct, WishlistAlert, WishlistStats, RecommendedProduct } from '@/types/wishlist'
import {
  formatWishlistCount,
  getEmptyStateMessage,
  WISHLIST_CONFIG,
  WISHLIST_EVENTS,
} from '@/lib/wishlist/constants'

interface WishlistClientProps {
  initialItems: WishlistItemWithProduct[]
  initialStats: WishlistStats & { alerts: WishlistAlert[] }
  recommendations: RecommendedProduct[]
  uid: string
}

export default function WishlistClient({
  initialItems,
  initialStats,
  recommendations,
  uid,
}: WishlistClientProps) {
  const [items, setItems] = useState<WishlistItemWithProduct[]>(initialItems)
  const [stats, setStats] = useState(initialStats)
  const [isClearing, setIsClearing] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const handleRemoveItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product_id !== productId))
    setStats((prev) => ({
      ...prev,
      totalItems: Math.max(0, prev.totalItems - 1),
    }))
  }, [])

  const handleClearAll = useCallback(async () => {
    setIsClearing(true)
    try {
      const { clearWishlist } = await import('@/lib/wishlist/actions')
      const success = await clearWishlist(uid)
      if (success) {
        setItems([])
        setStats({
          totalItems: 0,
          itemsOnAlert: 0,
          itemsLowStock: 0,
          itemsPriceDropped: 0,
          estimatedSavings: 0,
          alerts: [],
        })
      }
    } catch (error) {
      console.error('Clear wishlist error:', error)
    } finally {
      setIsClearing(false)
    }
  }, [uid])

  const isEmpty = items.length === 0

  return (
    <div className="min-h-screen bg-white">
      {/* Page Header */}
      <div className="border-b border-black">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">WISHLIST</h1>
              <p className="mt-2 text-sm text-gray-700">Items you saved for later.</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatWishlistCount(stats.totalItems)}</p>
              {!isEmpty && (
                <button
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="mt-2 text-xs font-medium text-gray-700 hover:text-black transition-colors disabled:opacity-50"
                >
                  {isClearing ? 'Clearing...' : 'Clear All'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <WishlistEmptyState />
      ) : (
        <>
          {/* Alerts Section */}
          {stats.alerts.length > 0 && <WishlistAlerts alerts={stats.alerts} stats={stats} />}

          {/* Products Grid */}
          <div className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <WishlistProductCard
                  key={item.product_id}
                  item={item}
                  uid={uid}
                  onRemove={handleRemoveItem}
                  isRemoving={isRemoving === item.product_id}
                />
              ))}
            </div>
          </div>

          {/* Recommendations Section */}
          {recommendations.length > 0 && (
            <WishlistRecommendations recommendations={recommendations} />
          )}
        </>
      )}
    </div>
  )
}
