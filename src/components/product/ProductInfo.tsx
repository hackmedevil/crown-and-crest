'use client'

import { Star } from 'lucide-react'
import type { PDPProduct } from '@/types/pdp'

interface ProductInfoProps {
  product: PDPProduct
  rating?: number
  reviewCount?: number
  sellingPrice?: number
  mrp?: number
  stockLabel?: string
  shortDescription?: string | null
}

/**
 * ProductInfo Component
 * 
 * Displays product header information:
 * - Category/brand
 * - Product name
 * - Ratings (placeholder for now)
 */
export default function ProductInfo({
  product,
  rating = 4.8,
  reviewCount = 124,
  sellingPrice,
  mrp,
  stockLabel,
  shortDescription,
}: ProductInfoProps) {
  const hasDiscount = typeof mrp === 'number' && typeof sellingPrice === 'number' && mrp > sellingPrice
  const discountPct = hasDiscount ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0

  return (
    <div className="mb-6">
      <p className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-2">
        {product.category?.name || product.brand || 'Collection'}
      </p>
      <h1 className="text-4xl lg:text-5xl font-display text-gray-900 mb-3 leading-tight">{product.name}</h1>
      <div className="flex items-center gap-2">
        <span className="text-black text-xs px-2 py-0.5 rounded flex items-center gap-1">
          {rating.toFixed(1)} <Star className="w-3 h-3 fill-current" />
        </span>
        <span className="text-sm text-gray-500 underline underline-offset-4">
          {reviewCount} reviews
        </span>
      </div>

      {typeof sellingPrice === 'number' && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-2xl font-bold text-gray-900">Rs.{sellingPrice.toLocaleString('en-IN')}</span>
          {hasDiscount && (
            <>
              <span className="text-sm text-gray-500 line-through">Rs.{mrp.toLocaleString('en-IN')}</span>
              <span className="text-sm font-semibold text-green-600">({discountPct}% OFF)</span>
            </>
          )}
        </div>
      )}

      {stockLabel && <p className="mt-2 text-sm font-medium text-gray-700">{stockLabel}</p>}
      {shortDescription && (
        <div
          className="mt-4 text-base text-gray-600 leading-relaxed max-w-prose"
          dangerouslySetInnerHTML={{ __html: shortDescription }}
        />
      )}
    </div>
  )
}
