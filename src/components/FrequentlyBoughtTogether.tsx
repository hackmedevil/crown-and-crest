'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { useCart } from '@/context/CartContext'

interface BundleProduct {
  id: string
  name: string
  basePrice: number
  imageUrl: string
  frequency: number
}

interface FrequentlyBoughtTogetherProps {
  products: BundleProduct[]
  currentProductId: string
  currentProductName: string
  currentProductPrice: number
}

export default function FrequentlyBoughtTogether({
  products,
  currentProductId,
  currentProductName,
  currentProductPrice,
}: FrequentlyBoughtTogetherProps) {
  const { addToCart } = useCart()
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [isAdding, setIsAdding] = useState(false)

  if (!products || products.length === 0) return null

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const calculatedBundleValue = () => {
    let total = currentProductPrice
    products.forEach(product => {
      if (selectedProducts.has(product.id)) {
        total += product.basePrice
      }
    })
    return total
  }

  const bundleValue = calculatedBundleValue()
  const savings = Math.round(bundleValue * 0.05) // Simulate 5% bundle discount

  const handleAddBundle = async () => {
    setIsAdding(true)
    try {
      // Add current product
      addToCart({
        product_id: currentProductId,
        variant_id: '',
        name: currentProductName,
        price: currentProductPrice,
        quantity: 1,
        size: '',
        color: '',
        image_url: '',
      })

      // Add selected bundle products
      for (const productId of selectedProducts) {
        const product = products.find(p => p.id === productId)
        if (product) {
          addToCart({
            product_id: productId,
            variant_id: '',
            name: product.name,
            price: product.basePrice,
            quantity: 1,
            size: '',
            color: '',
            image_url: product.imageUrl,
          })
        }
      }
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="py-12 border-t">
      <h2 className="text-2xl font-serif mb-6">Frequently Bought Together</h2>

      <div className="bg-gray-50 rounded-lg p-6">
        {/* Bundle Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Current Product */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-200 rounded-lg relative">
              <div className="text-xs text-gray-600 flex items-center justify-center h-full">
                Main Product
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">This item</p>
              <p className="font-medium text-gray-900">{currentProductName}</p>
              <p className="text-lg font-bold text-gray-900">
                ₹{(currentProductPrice / 100).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Plus Icon */}
          <div className="flex items-center justify-center text-2xl font-bold text-gray-400">
            +
          </div>
        </div>

        {/* Bundle Products */}
        <div className="space-y-3 mb-6">
          {products.map(product => (
            <label
              key={product.id}
              className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-white transition"
            >
              <input
                type="checkbox"
                checked={selectedProducts.has(product.id)}
                onChange={() => toggleProduct(product.id)}
                className="w-4 h-4 text-amber-600 rounded"
              />

              <div className="w-16 h-16 bg-gray-200 rounded-lg ml-4 relative flex-shrink-0">
                {product.imageUrl && (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="flex-1 ml-4">
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-600">
                  Frequently bought with main item
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-gray-900">
                  ₹{(product.basePrice / 100).toLocaleString()}
                </p>
              </div>
            </label>
          ))}
        </div>

        {/* Bundle Summary */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-amber-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-600">Bundle total:</span>
            <span className="text-2xl font-bold text-gray-900">
              ₹{(bundleValue / 100).toLocaleString()}
            </span>
          </div>

          {selectedProducts.size > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-sm text-green-700 font-medium">
                Save ₹{(savings / 100).toLocaleString()} with bundle
              </span>
              <span className="text-sm text-green-700 font-bold">
                {Math.round((savings / bundleValue) * 100)}% OFF
              </span>
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddBundle}
          disabled={selectedProducts.size === 0 || isAdding}
          className="w-full"
        >
          {isAdding
            ? 'Adding to cart...'
            : `Add All to Cart (${selectedProducts.size + 1} items)`}
        </Button>

        <p className="text-xs text-gray-600 text-center mt-4">
          ✓ Free shipping on this bundle | ✓ Easy returns on all items
        </p>
      </div>
    </div>
  )
}
