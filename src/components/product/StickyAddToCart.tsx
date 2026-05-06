// ============================================
// STICKY ADD TO CART BAR (Phase 3)
// ============================================
// Appears after scrolling past product gallery
// Shows condensed product info + CTA buttons
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PDPProduct, PDPPricing, PDPVariant } from '@/types/pdp'

interface Props {
  product: PDPProduct
  pricing: PDPPricing
  selectedVariant: PDPVariant | null
  isOutOfStock: boolean
  selectionLabel: string
  onAddToCart: () => void
  onBuyNow: () => void
  isAddingToCart: boolean
  isBuyingNow: boolean
}

export default function StickyAddToCart({
  product,
  pricing,
  selectedVariant,
  isOutOfStock,
  selectionLabel,
  onAddToCart,
  onBuyNow,
  isAddingToCart,
  isBuyingNow
}: Props) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar after scrolling 800px (past gallery on most screens)
      setIsVisible(window.scrollY > 800)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const finalPrice = selectedVariant?.final_price || pricing.selling_price

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-900 truncate">
                  {product.name}
                </h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-lg font-bold text-gray-900">
                    ₹{finalPrice.toLocaleString('en-IN')}
                  </p>
                  {selectionLabel && (
                    <p className="text-xs text-gray-500">
                      {selectionLabel}
                    </p>
                  )}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onBuyNow}
                  disabled={isAddingToCart || isBuyingNow || isOutOfStock}
                  className="hidden md:block px-6 py-2.5 border-2 border-gray-900 text-gray-900 font-bold text-sm tracking-wide rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBuyingNow ? 'PROCESSING ORDER...' : 'BUY NOW'}
                </button>
                <button
                  type="button"
                  onClick={onAddToCart}
                  disabled={isAddingToCart || isBuyingNow || isOutOfStock}
                  className="px-6 py-2.5 bg-black text-white font-bold text-sm tracking-wide rounded shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isAddingToCart ? 'ADDING...' : isOutOfStock ? 'OUT OF STOCK' : 'ADD TO CART'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
