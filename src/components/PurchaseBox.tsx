'use client'

import { useState, useEffect } from 'react'
import { Truck, RotateCcw, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/context/CartContext'
import { trackAddToCart } from '@/lib/analytics/events'

interface ProductVariant {
  id: string
  size: string
  color?: string
  stock: number
  sku: string
}

interface PurchaseBoxProps {
  productId: string
  productName: string
  productPrice: number
  variants: ProductVariant[]
  inStock: boolean
  estimatedDelivery?: string
  onAddToCart?: () => void
  onBuyNow?: () => void
}

export default function PurchaseBox({
  productId,
  productName,
  productPrice,
  variants,
  inStock,
  estimatedDelivery = 'March 12',
  onAddToCart,
  onBuyNow,
}: PurchaseBoxProps) {
  const { addToCart } = useCart()

  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [error, setError] = useState<string>('')

  // Get available sizes and colors from variants
  const availableSizes = [...new Set(variants.map(v => v.size))].sort()
  const availableColors = selectedSize
    ? [
        ...new Set(
          variants.filter(v => v.size === selectedSize).map(v => v.color || 'Default')
        ),
      ]
    : [
        ...new Set(
          variants.map(v => v.color || 'Default')
        ),
      ]

  // Get current variant
  const currentVariant = variants.find(
    v =>
      v.size === selectedSize &&
      (selectedColor ? v.color === selectedColor : !v.color || v.color === 'Default')
  )

  const availableStock = currentVariant?.stock || 0

  const handleAddToCart = async () => {
    if (!selectedSize) {
      setError('Please select a size')
      return
    }

    if (!currentVariant) {
      setError('Selected variant not available')
      return
    }

    setIsAddingToCart(true)
    setError('')

    try {
      addToCart({
        product_id: productId,
        variant_id: currentVariant.id,
        name: productName,
        price: productPrice,
        quantity,
        size: selectedSize,
        color: selectedColor || 'Default',
        image_url: '', // Will be fetched by cart context
      })

      // Track analytics
      trackAddToCart(
        productId,
        productName,
        productPrice,
        quantity,
        selectedSize,
        productPrice * quantity
      )

      if (onAddToCart) onAddToCart()
    } catch (err) {
      setError('Failed to add to cart')
    } finally {
      setIsAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    await handleAddToCart()
    if (onBuyNow) onBuyNow()
  }

  return (
    <div className="space-y-6 py-6 border-b">
      {/* Size Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Size *
        </label>
        <div className="grid grid-cols-5 gap-2">
          {availableSizes.map(size => (
            <button
              key={size}
              onClick={() => {
                setSelectedSize(size)
                setError('')
                // Reset color when size changes
                const colorsForSize = [
                  ...new Set(
                    variants.filter(v => v.size === size).map(v => v.color || 'Default')
                  ),
                ]
                if (!colorsForSize.includes(selectedColor)) {
                  setSelectedColor(colorsForSize[0] || '')
                }
              }}
              className={`py-2 px-3 font-medium rounded border-2 transition ${
                selectedSize === size
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-gray-900'
              }`}
              disabled={!variants.some(v => v.size === size)}
            >
              {size}
            </button>
          ))}
        </div>
        {selectedSize && (
          <div className="mt-2">
            <button className="text-xs text-blue-600 hover:underline">Size Guide</button>
          </div>
        )}
      </div>

      {/* Color Selector */}
      {availableColors.length > 1 && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {availableColors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`px-4 py-2 rounded border-2 transition ${
                  selectedColor === color
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-900 border-gray-300 hover:border-gray-900'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          Quantity
        </label>
        <div className="flex items-center gap-4 w-fit border rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100"
            disabled={quantity <= 1}
          >
            −
          </button>
          <span className="w-8 text-center font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100"
            disabled={quantity >= availableStock}
          >
            +
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleAddToCart}
          variant="secondary"
          className="flex-1"
          disabled={!inStock || !selectedSize || isAddingToCart}
        >
          {isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </Button>
        <Button
          onClick={handleBuyNow}
          className="flex-1"
          disabled={!inStock || !selectedSize || isAddingToCart}
        >
          {isAddingToCart ? 'Processing...' : 'Buy Now'}
        </Button>
      </div>

      {/* Trust Signals - Delivery & Returns */}
      <div className="space-y-3 pt-6 border-t">
        <div className="flex items-start gap-3">
          <Truck className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Delivery by {estimatedDelivery}</p>
            <p className="text-xs text-gray-600">Standard delivery to your location</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <RotateCcw className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Easy Returns</p>
            <p className="text-xs text-gray-600">30-day return policy, no questions asked</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Secure Checkout</p>
            <p className="text-xs text-gray-600">SSL-encrypted payment processing</p>
          </div>
        </div>
      </div>
    </div>
  )
}
