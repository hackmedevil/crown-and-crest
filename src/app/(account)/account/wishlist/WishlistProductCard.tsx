'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { WishlistItemWithProduct } from '@/types/wishlist'
import {
  formatPrice,
  getStockStatus,
  getPriceDropDisplay,
  getDefaultImage,
} from '@/lib/wishlist/constants'

interface WishlistProductCardProps {
  item: WishlistItemWithProduct
  uid: string
  onRemove: (productId: string) => void
  isRemoving?: boolean
}

export default function WishlistProductCard({
  item,
  uid,
  onRemove,
  isRemoving,
}: WishlistProductCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const stockStatus = getStockStatus(item.variant?.stock_quantity || 0)
  const priceDropText = getPriceDropDisplay(item.product.base_price, item.product.base_price)

  // Get primary image
  const images = Array.isArray(item.product.images)
    ? item.product.images
    : item.product.images
      ? JSON.parse(String(item.product.images))
      : []
  const primaryImage =
    images.length > 0
      ? typeof images[0] === 'string'
        ? images[0]
        : images[0].url
      : getDefaultImage()

  const handleRemove = async () => {
    setIsLoading(true)
    try {
      const { removeFromWishlist } = await import('@/lib/wishlist/actions')
      const success = await removeFromWishlist(uid, item.product_id)
      if (success) {
        onRemove(item.product_id)
      }
    } catch (error) {
      console.error('Remove from wishlist error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddToCart = async () => {
    // This would integrate with the main cart system
    // For now, redirect to product page
    // window.location.href = `/product/${item.product.slug}`
  }

  return (
    <div
      className="relative bg-neutral-50 border border-black transition-all duration-200 hover:shadow-lg"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Image Container */}
      <div className="relative w-full aspect-square bg-black overflow-hidden group">
        <Image
          src={primaryImage}
          alt={item.product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = getDefaultImage()
          }}
        />

        {/* Stock Indicator Badge - Top Right */}
        {stockStatus.badge && (
          <div className={`absolute top-2 right-2 ${stockStatus.badge.color} text-white px-2 py-1 text-xs font-black`}>
            {stockStatus.badge.label}
          </div>
        )}

        {/* Price Drop Badge - Top Left */}
        {priceDropText && (
          <div className="absolute top-2 left-2 bg-red-900 text-white px-2 py-1 text-xs font-black leading-tight">
            {priceDropText}
          </div>
        )}

        {/* Remove Heart Icon - Top Right (always visible on hover) */}
        <button
          onClick={handleRemove}
          disabled={isLoading || isRemoving}
          className="absolute top-3 right-3 w-8 h-8 bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50"
          title="Remove from wishlist"
        >
          <svg
            className="w-4 h-4 fill-current"
            viewBox="0 0 24 24"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09 1.09-1.28 2.76-2.09 4.5-2.09 3.08 0 5.5 2.42 5.5 5.5 0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      {/* Product Info */}
      <div className="p-3 border-t border-black">
        {/* Name & Category */}
        <Link
          href={`/product/${item.product.slug}`}
          className="block group"
        >
          <h3 className="text-xs font-black tracking-tight group-hover:underline line-clamp-2">
            {item.product.name.toUpperCase()}
          </h3>
          <p className="text-xs text-gray-600 mt-1 line-clamp-1">{item.product.category}</p>
        </Link>

        {/* Price */}
        <div className="mt-3 border-t border-gray-200 pt-2">
          <p className="text-sm font-bold">{formatPrice(item.product.base_price)}</p>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-2">
          <Link
            href={`/product/${item.product.slug}`}
            className="w-full inline-flex items-center justify-center px-3 py-2 bg-black text-white text-xs font-black hover:bg-gray-800 transition-colors"
          >
            ADD TO CART
          </Link>

          <button
            onClick={handleRemove}
            disabled={isLoading || isRemoving}
            className="w-full px-3 py-2 border border-black text-xs font-medium text-black hover:bg-black hover:text-white transition-colors disabled:opacity-50"
          >
            {isRemoving || isLoading ? 'Removing...' : 'REMOVE'}
          </button>
        </div>

        {/* Stock Status Info */}
        {!stockStatus.badge && (
          <p className="text-xs text-gray-700 mt-3 text-center">{stockStatus.text}</p>
        )}
      </div>
    </div>
  )
}
