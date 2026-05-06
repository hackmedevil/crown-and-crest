'use server'

import { supabaseServer } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

/**
 * Validate cart and prepare order items with price snapshots
 * Called at checkout submission before payment
 * 
 * Returns:
 * - validated cart items with resolved prices
 * - total amount
 * - or error if validation fails
 */
export async function validateCartForCheckout() {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'User not authenticated' }
  }

  // Re-fetch cart with full variant and product data
  const { data: cartItems, error: cartError } = await supabaseServer
    .from('cart_items')
    .select(`
      id,
      quantity,
      variant_id,
      variants:variant_id (
        id,
        sku,
        size,
        color,
        price_override,
        enabled,
        product_id,
        products:product_id (
          id,
          name,
          base_price
        )
      )
    `)
    .eq('firebase_uid', user.uid)

  if (cartError || !cartItems || cartItems.length === 0) {
    return { success: false, error: 'Cart is empty' }
  }

  // CRITICAL: Get reservation-aware availability for ALL variants in one call
  const variantIds = cartItems
    .map(item => {
      const variant = Array.isArray(item.variants) ? item.variants[0] : item.variants
      return variant?.id
    })
    .filter(Boolean) as string[]

  const { data: availabilityData, error: availError } = await supabaseServer
    .rpc('get_variant_availability', { variant_ids: variantIds })

  if (availError || !availabilityData) {
    console.error('Failed to fetch availability:', availError)
    return { success: false, error: 'Unable to verify stock availability' }
  }

  // Create availability map for fast lookup
  const availabilityMap = new Map<string, {
    variant_id: string
    available_to_sell: number  
    is_out_of_stock: boolean
  }>()
  availabilityData.forEach((av: {
    variant_id: string
    available_to_sell: number
    is_out_of_stock: boolean
  }) => {
    availabilityMap.set(av.variant_id, av)
  })

  // Validate each item and prepare order items
  const preparedItems: Array<{
    variant_id: string
    sku: string
    quantity: number
    price_at_purchase: number
    product_name: string
  }> = []

  let totalAmount = 0

  for (const item of cartItems) {
    const variant = Array.isArray(item.variants) ? item.variants[0] : item.variants
    
    // Skip ghost items (matches getCart logic)
    if (!variant) {
      console.warn(`[Checkout] Skipping orphan cart item ${item.id}`)
      continue
    }

    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products
    
    // Skip if product missing
    if (!product) {
      console.warn(`[Checkout] Skipping orphan variant ${variant.id} in item ${item.id}`)
      continue
    }

    // VALIDATION 1: Check if variant is enabled
    if (!variant.enabled) {
      return {
        success: false,
        error: `${product.name} (${variant.size || ''} ${variant.color || ''}) is no longer available`
      }
    }

    // VALIDATION 2: Check reservation-aware availability
    const availability = availabilityMap.get(variant.id)
    if (!availability) {
      return {
        success: false,
        error: `Unable to verify availability for ${product.name}`
      }
    }

    if (availability.available_to_sell < item.quantity) {
      return {
        success: false,
        error: `Not enough stock for ${product.name}. Available: ${availability.available_to_sell}, Requested: ${item.quantity}`
      }
    }

    // PRICE CALCULATION: Respect variant override
    const price = variant.price_override ?? product.base_price

    // Prepare order item with price snapshot
    preparedItems.push({
      variant_id: variant.id,
      sku: variant.sku,
      quantity: item.quantity,
      price_at_purchase: price,  // SNAPSHOT HERE
      product_name: product.name, // For error messages only
    })

    totalAmount += price * item.quantity
  }

  return {
    success: true,
    items: preparedItems,
    totalAmount,
  }
}
