'use client'

import type { PDPPricing, PDPVariant } from '@/types/pdp'
import { AlertTriangle } from 'lucide-react'

interface PriceDisplayProps {
  pricing: PDPPricing
  selectedVariant: PDPVariant | null
  isOutOfStock: boolean
}

/**
 * PriceDisplay Component
 * 
 * Renders price exclusively from resolved pricing model:
 * - variant.final_price (if variant selected)
 * - pricing.mrp
 * - pricing.savings_amount
 * - pricing.savings_percentage
 * 
 * No client-side price calculations.
 */
export default function PriceDisplay({
  pricing,
  selectedVariant,
  isOutOfStock
}: PriceDisplayProps) {
  // Use variant's final_price if selected, otherwise use product pricing
  const displayPrice = selectedVariant?.final_price ?? pricing.selling_price
  const displayMRP = pricing.mrp
  const savingsAmount = displayMRP - displayPrice
  const savingsPercentage = displayMRP > 0 
    ? Math.round((savingsAmount / displayMRP) * 100) 
    : 0

  const hasSavings = savingsAmount > 0 && pricing.discount_active

  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-2xl font-bold text-gray-900">
          ₹{displayPrice.toLocaleString('en-IN')}
        </span>
        {hasSavings && (
          <>
            <span className="text-lg text-gray-400 line-through">
              ₹{displayMRP.toLocaleString('en-IN')}
            </span>
            <span className="text-red-600 font-medium bg-red-50 px-2 py-1 rounded text-sm">
              {savingsPercentage}% OFF
            </span>
          </>
        )}
      </div>
      
      {isOutOfStock ? (
        <p className="text-sm text-red-600 font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4" />
          Out of Stock
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-green-600 font-medium">
            Inclusive of all taxes • Free Shipping
          </p>
          {hasSavings && (
            <p className="text-xs text-gray-500">
              You save ₹{savingsAmount.toLocaleString('en-IN')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
