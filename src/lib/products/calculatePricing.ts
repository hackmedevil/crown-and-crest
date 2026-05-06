/**
 * Product Pricing Calculation Module
 * 
 * Replaces hardcoded pricing logic (e.g., mrp = price * 1.3) with real
 * calculation pipeline using database pricing engine fields.
 * 
 * Calculation order:
 * 1. Base price = variant.price_override ?? product.base_price
 * 2. Apply discount if enabled (percentage or fixed)
 * 3. MRP = product.mrp ?? (base_price * 1.3) [fallback]
 * 4. Calculate savings
 */

import { PDPPricing, PricingParams } from '@/types/pdp'

export function calculatePrice(params: PricingParams): PDPPricing {
  const {
    base_price,
    variant_price_override,
    discount_engine_enabled,
    discount_type,
    discount_value,
    mrp,
    cost_price,
  } = params

  // Step 1: Determine the base selling price
  const basePrice = variant_price_override ?? base_price

  // Step 2: Apply discount if enabled
  let selling_price = basePrice
  let discount_active = false

  if (discount_engine_enabled && discount_value && discount_value > 0) {
    discount_active = true

    if (discount_type === 'percentage') {
      // Percentage discount: reduce by discount_value%
      selling_price = basePrice * (1 - discount_value / 100)
    } else {
      // Fixed discount: subtract discount_value
      selling_price = Math.max(0, basePrice - discount_value)
    }
  }

  // Step 3: Determine MRP (use DB value or compute fallback)
  // Only use fallback if DB MRP is null
  const finalMRP = mrp ?? basePrice * 1.3

  // Step 4: Calculate savings
  const savings_amount = finalMRP - selling_price
  const savings_percentage = finalMRP > 0 ? (savings_amount / finalMRP) * 100 : 0

  // Round to 2 decimal places for display
  return {
    base_price: Math.round(basePrice * 100) / 100,
    selling_price: Math.round(selling_price * 100) / 100,
    mrp: Math.round(finalMRP * 100) / 100,
    discount_type,
    discount_value: discount_value ?? null,
    discount_active,
    savings_amount: Math.round(savings_amount * 100) / 100,
    savings_percentage: Math.round(savings_percentage * 100) / 100,
  }
}

/**
 * Calculate pricing for a variant, inheriting product-level pricing
 * but allowing variant-specific price override.
 */
export function calculateVariantPrice(
  productPricing: PricingParams,
  variantPriceOverride: number | null
): PDPPricing {
  return calculatePrice({
    ...productPricing,
    variant_price_override: variantPriceOverride,
  })
}
