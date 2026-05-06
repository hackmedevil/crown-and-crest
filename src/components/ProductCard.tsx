'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Star, ShoppingBag, Heart, Package } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { addToGuestCart } from '@/lib/cart/guestCart'
import { useRouter } from 'next/navigation'

/**
 * ProductCard Pricing Logic (To Be Implemented):
 * - Price should be SELLING_PRICE (calculated from base_price - discount)
 * - Crossed-out price should be MRP
 * - Discount percentage should be calculated as: ((MRP - SELLING_PRICE) / MRP) * 100
 * - BASE_PRICE and COST_PRICE should NEVER be shown to customers
 * - If no discount: selling_price = base_price, but still show discount from MRP
 * 
 * Current Implementation: Using temporary hardcoded values until pricing data is updated
 */

interface ProductCardProps {
  id: string
  name: string
  slug: string
  price: number // Currently base_price, should be selling_price
  imageUrl: string | null
  category: string | null
  rating?: number
  reviewCount?: number
  isNew?: boolean
  isBestseller?: boolean
  // TODO: Add these props when data layer is updated:
  // mrp?: number
  // selling_price?: number
  // discount_percentage?: number
}

export default function ProductCard({
  id,
  name,
  slug,
  price,
  imageUrl,
  category,
  rating = 4.5,
  reviewCount = 128,
  isNew = false,
  isBestseller = false,
}: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [showAddedNotif, setShowAddedNotif] = useState(false)
  const { isAuthenticated, requireAuth } = useAuth()
  const router = useRouter()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowAddedNotif(true)
    setTimeout(() => setShowAddedNotif(false), 2000)
  }

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated) {
      void requireAuth(async () => {
        router.push(`/product/${slug}`)
      }, 'buyNow')
      return
    }

    router.push(`/product/${slug}`)
  }

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsWishlisted(!isWishlisted)
  }

  return (
    <Link href={`/product/${slug}`}>
      <div className="group block h-full">
        {/* Product Image Container */}
        <div className="relative aspect-square mb-4 bg-white rounded-lg overflow-hidden border border-neutral-200 transition-all duration-300 group-hover:shadow-lg">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              quality={75}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-100">
              <Package className="w-16 h-16 text-neutral-300" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {isNew && (
              <span className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                NEW
              </span>
            )}
            {isBestseller && (
              <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                ⭐ BESTSELLER
              </span>
            )}
            {category && (
              <span className="px-3 py-1 bg-black/70 text-white text-xs font-semibold rounded-full">
                {category}
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={toggleWishlist}
            className="absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
            aria-label="Add to wishlist"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                isWishlisted
                  ? 'fill-red-500 text-red-500'
                  : 'text-gray-600 hover:text-red-500'
              }`}
            />
          </button>

          {/* Add to Cart & Buy Now Buttons - On Hover */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
            <button
              onClick={handleAddToCart}
              className="flex-1 py-2 bg-white text-black font-semibold text-xs opacity-90 hover:opacity-100 transition-all rounded flex items-center justify-center gap-1"
            >
              <ShoppingBag className="w-3 h-3" />
              Add
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 py-2 bg-orange-500 text-white font-semibold text-xs hover:bg-orange-600 transition-colors rounded flex items-center justify-center gap-1"
            >
              Buy Now
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          {/* Category */}
          {category && (
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {category}
            </p>
          )}

          {/* Name */}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">
              ({reviewCount})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 pt-1">
            <p className="text-lg font-bold text-gray-900">
              ₹{price.toLocaleString('en-IN')}
            </p>
            <p className="text-sm text-gray-500 line-through">
              ₹{Math.round(price * 1.4).toLocaleString('en-IN')}
            </p>
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded">
              Save 30%
            </span>
          </div>

          {/* In Stock Indicator */}
          <div className="flex items-center gap-2 pt-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-green-700 font-semibold">In Stock</span>
          </div>
        </div>

        {/* Added to Cart Notification */}
        {showAddedNotif && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg text-white text-sm font-semibold">
            ✓ Added to Cart
          </div>
        )}
      </div>
    </Link>
  )
}
