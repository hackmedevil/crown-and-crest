'use client'

import { useState } from 'react'
import ProductCard from '@/components/product/ProductCard'
import QuickViewModal from '@/components/modals/QuickViewModal'
import { Eye, ShoppingCart, Heart } from 'lucide-react'
import type { GridProduct } from '@/types/grid'

interface EnhancedProductCardProps {
  product: GridProduct
  priority?: boolean
  prefetchOnHover?: boolean
  onAddToCart?: (productId: string, variantId: string, quantity: number) => void
  onAddToWishlist?: (productId: string) => void
}

/**
 * EnhancedProductCard with Quick View Modal
 * 
 * Wraps ProductCard with hover actions:
 * - Quick View (Eye icon)
 * - Add to Cart (ShoppingCart icon)
 * - Wishlist (Heart icon)
 */
export default function EnhancedProductCard({
  product,
  priority = false,
  prefetchOnHover = true,
  onAddToCart,
  onAddToWishlist
}: EnhancedProductCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showQuickView, setShowQuickView] = useState(false)

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowQuickView(true)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // In real app, add logic to handle quick add to cart
    onAddToCart?.(product.id, 'default-variant', 1)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAddToWishlist?.(product.id)
  }

  return (
    <>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Original ProductCard */}
        <ProductCard
          product={product}
          priority={priority}
          prefetchOnHover={prefetchOnHover}
        />

        {/* Hover Actions Overlay */}
        <div
          className={`absolute bottom-2 left-2 right-2 flex justify-center gap-2 transition-all duration-300 ${
            isHovered 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          {/* Quick View Button */}
          <button
            onClick={handleQuickView}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg shadow-lg hover:bg-gray-100 transition-all"
            aria-label="Quick view"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Quick View</span>
          </button>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            className="p-2 bg-black text-white rounded-lg shadow-lg hover:bg-gray-800 transition-all"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>

          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className="p-2 bg-white text-black rounded-lg shadow-lg hover:bg-gray-100 transition-all"
            aria-label="Add to wishlist"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick View Modal */}
      <QuickViewModal
        product={product}
        isOpen={showQuickView}
        onClose={() => setShowQuickView(false)}
        onAddToCart={onAddToCart}
        onAddToWishlist={onAddToWishlist}
      />
    </>
  )
}
