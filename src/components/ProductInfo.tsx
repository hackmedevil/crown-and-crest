'use client'

import { Star } from 'lucide-react'

interface ProductInfoProps {
  name: string
  basePrice: number
  comparePrice?: number
  rating: number
  reviewCount: number
  inStock: boolean
  stockCount?: number
}

export default function ProductInfo({
  name,
  basePrice,
  comparePrice,
  rating,
  reviewCount,
  inStock,
  stockCount,
}: ProductInfoProps) {
  const discount = comparePrice ? Math.round(((comparePrice - basePrice) / comparePrice) * 100) : 0
  const savings = comparePrice ? comparePrice - basePrice : 0

  return (
    <div className="space-y-4 pb-6 border-b">
      {/* Product Name */}
      <h1 className="text-3xl font-serif text-gray-900">{name}</h1>

      {/* Rating & Reviews */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {rating.toFixed(1)}
          </span>
        </div>
        <button className="text-sm text-blue-600 hover:underline">
          {reviewCount} reviews
        </button>
      </div>

      {/* Price Section */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-gray-900">
            ₹{(basePrice / 100).toLocaleString('en-IN', {
              minimumFractionDigits: 0,
            })}
          </span>

          {comparePrice && (
            <>
              <span className="text-lg text-gray-500 line-through">
                ₹{(comparePrice / 100).toLocaleString('en-IN', {
                  minimumFractionDigits: 0,
                })}
              </span>
              <span className="inline-block px-2 py-1 bg-red-50 text-red-700 font-semibold text-sm rounded">
                {discount}% OFF
              </span>
            </>
          )}
        </div>

        {savings > 0 && (
          <p className="text-sm text-green-700 font-medium">
            You save ₹{(savings / 100).toLocaleString('en-IN', {
              minimumFractionDigits: 0,
            })}
          </p>
        )}
      </div>

      {/* Stock Status */}
      <div>
        {inStock ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-600" />
            <span className="text-sm font-medium text-green-700">In Stock</span>
            {stockCount !== undefined && stockCount < 10 && (
              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
                Only {stockCount} left
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-600" />
            <span className="text-sm font-medium text-red-700">Out of Stock</span>
          </div>
        )}
      </div>
    </div>
  )
}
