'use client'

import type { PDPProduct, PDPVariant, PDPPricing } from '@/types/pdp'

interface AddToCartProps {
  product: PDPProduct
  pricing: PDPPricing
  selectedVariant: PDPVariant | null
  isOutOfStock: boolean
  isAddingToCart: boolean
  isBuyingNow: boolean
  onAddToCart: () => Promise<void>
  onBuyNow: () => Promise<void>
  selectionLabel?: string
}

/**
 * AddToCart Component
 * 
 * Handles add to cart and buy now actions
 * - Desktop: Two buttons side by side
 * - Mobile: Sticky bottom bar
 */
export default function AddToCart({
  product,
  pricing,
  selectedVariant,
  isOutOfStock,
  isAddingToCart,
  isBuyingNow,
  onAddToCart,
  onBuyNow,
  selectionLabel
}: AddToCartProps) {
  const displayPrice = selectedVariant?.final_price ?? pricing.selling_price

  return (
    <>
      {/* Desktop Actions */}
      <div className="hidden md:flex gap-4 mb-8">
        <button
          type="button"
          data-buy-now-button
          onClick={onBuyNow}
          disabled={isAddingToCart || isBuyingNow || isOutOfStock || !selectedVariant}
          className="flex-1 bg-white border border-gray-900 text-gray-900 font-bold text-sm tracking-widest rounded uppercase py-4 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBuyingNow ? 'Processing order...' : 'Buy Now'}
        </button>
        <button
          type="button"
          data-add-to-cart-button
          onClick={onAddToCart}
          disabled={isAddingToCart || isBuyingNow || isOutOfStock || !selectedVariant}
          className="flex-1 bg-black text-white font-bold text-sm tracking-widest rounded uppercase py-4 shadow-lg shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
        >
          {isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 md:hidden z-50 flex gap-4 backdrop-blur-md bg-white/95">
        <div className="flex-1">
          <p className="text-lg font-bold text-gray-900">
            ₹{displayPrice.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-red-600 font-medium">Inclusive of taxes</p>
        </div>
        <button
          type="button"
          onClick={onBuyNow}
          disabled={isAddingToCart || isBuyingNow || isOutOfStock || !selectedVariant}
          className="flex-1 bg-white border border-gray-900 text-gray-900 font-bold text-sm tracking-widest rounded uppercase py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBuyingNow ? 'Processing order...' : 'Buy Now'}
        </button>
        <button
          type="button"
          onClick={onAddToCart}
          disabled={isAddingToCart || isBuyingNow || isOutOfStock || !selectedVariant}
          className="flex-1 bg-black text-white font-bold text-sm tracking-widest rounded uppercase py-3 shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </>
  )
}
