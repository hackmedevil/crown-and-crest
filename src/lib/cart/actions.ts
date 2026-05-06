'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
// Using supabase server client for server-side operations
import { supabaseServer } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { CartItem } from '@/types/cart'
import { getCurrentUser } from '@/lib/auth'
import { rateLimit, RATE_LIMITS, getUserRateLimitKey } from '@/lib/rate-limit'

interface VariantAvailability {
  variant_id: string
  available_to_sell: number
  is_out_of_stock: boolean
}

async function ensureUserUid(uid?: string): Promise<string> {
  if (uid) return uid

  const user = await getCurrentUser()

  if (!user) {
    redirect('/?openAuth=1&redirect=/cart')
  }

  return user.uid
}

/* =========================
  GET CART
========================= */
export async function getCart(uid?: string): Promise<CartItem[]> {
  const userUid = await ensureUserUid(uid)

  // Query cart items with variant and product data
  const { data, error } = await supabaseServer
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
        stock_quantity,
        low_stock_threshold,
        enabled,
        position,
        created_at,
        product_id,
        products:product_id (
          id,
          name,
          slug,
          base_price,
          image_url,
          is_active,
          created_at
        )
      )
    `)
    .eq('firebase_uid', userUid)

  if (error || !data) {
    console.error('getCart error:', error)
    return []
  }

  // Get reservation-aware availability for all cart variants
  const variantIds = data.map(item => item.variant_id).filter(Boolean)
  const availabilityMap = new Map<string, VariantAvailability>()
  
  if (variantIds.length > 0) {
    const { data: availabilityData, error: availError } = await supabaseServer
      .rpc('get_variant_availability', { variant_ids: variantIds })
    
    if (!availError && availabilityData) {
      availabilityData.forEach((av: VariantAvailability) => {
        availabilityMap.set(av.variant_id, av)
      })
    } else {
      console.error('Cart availability fetch error:', availError)
    }
  }

  return data
    .map((item) => {
      const variant = Array.isArray(item.variants)
        ? item.variants[0]
        : item.variants

      if (!variant) return null

      const product = Array.isArray(variant.products)
        ? variant.products[0]
        : variant.products

      if (!product) return null

      const availability = availabilityMap.get(item.variant_id)

      return {
        id: item.id,
        quantity: item.quantity,
        variant_id: item.variant_id,
        product_id: product.id,
        products: product,
        variants: {
          id: variant.id,
          product_id: variant.product_id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          price_override: variant.price_override,
          stock_quantity: variant.stock_quantity,
          low_stock_threshold: variant.low_stock_threshold || 10,
          enabled: variant.enabled,
          position: variant.position || 0,
          created_at: variant.created_at,
          available_to_sell: availability?.available_to_sell ?? variant.stock_quantity,
          is_out_of_stock: availability?.is_out_of_stock ?? false
        },
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null) as CartItem[]
}


/* =========================
   ADD TO CART
========================= */
export async function addToCart(
  prevState: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get authenticated user
    const userUid = await ensureUserUid()

    // Rate limit check
    const rateLimitKey = getUserRateLimitKey('cart:add', userUid)
    const { success: withinLimit } = await rateLimit(rateLimitKey, RATE_LIMITS.CART_MUTATION)
    if (!withinLimit) {
      return { success: false, error: 'Too many requests. Please wait a moment and try again.' }
    }

    const productId = formData.get('productId') as string
    const variantId = formData.get('variantId') as string | null
    const quantity = parseInt(formData.get('quantity') as string) || 1

    // Validation
    if (!productId) {
      return { success: false, error: 'Invalid product' }
    }
    if (quantity < 1) {
      return { success: false, error: 'Invalid quantity' }
    }

    // Check if product exists and is active
    const { data: product, error: productError } = await supabaseServer
      .from('products')
      .select('id, is_active, base_price')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return { success: false, error: 'Product not found' }
    }
    if (!product.is_active) {
      return { success: false, error: 'This product is no longer available' }
    }

    // If variantId is provided, verify variant exists and is enabled
    if (variantId) {
      const { data: variant, error: variantError } = await supabaseServer
        .from('variants')
        .select('id, enabled')
        .eq('id', variantId)
        .eq('product_id', productId)
        .single()

      if (variantError || !variant) {
        return { success: false, error: 'Variant not found' }
      }
      if (!variant.enabled) {
        return { success: false, error: 'This variant is no longer available' }
      }

      // CRITICAL: Check reservation-aware availability
      const { data: availabilityData, error: availError } = await supabaseServer
        .rpc('get_variant_availability', { variant_ids: [variantId] })
      
      if (availError || !availabilityData || availabilityData.length === 0) {
        console.error('Failed to fetch availability:', availError)
        return { success: false, error: 'Unable to verify stock availability' }
      }

      const availability = availabilityData[0]
      if (availability.available_to_sell < quantity) {
        return { success: false, error: `Only ${availability.available_to_sell} units available` }
      }

      // Check if variant already in cart
      const { data: existing } = await supabaseServer
        .from('cart_items')
        .select('id, quantity')
        .eq('firebase_uid', userUid)
        .eq('variant_id', variantId)
        .single()

      if (existing) {
        // Increment quantity
        const newQuantity = existing.quantity + quantity
        
        // Verify reservation-aware availability for new quantity
        if (availability.available_to_sell < newQuantity) {
          return { success: false, error: `Only ${availability.available_to_sell} units available` }
        }

        await supabaseServer
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existing.id)
      } else {
        // Insert new cart item with variant
        const { error: insertError } = await supabaseServer.from('cart_items').insert({
          firebase_uid: userUid,
          variant_id: variantId,
          quantity,
        })

        if (insertError) {
          console.error('Cart insert error:', insertError)
          return { success: false, error: 'Failed to add to cart' }
        }
      }
    } else {
      // Product without variants - check if product already in cart
      const { data: existing } = await supabaseServer
        .from('cart_items')
        .select('id, quantity')
        .eq('firebase_uid', userUid)
        .eq('product_id', productId)
        .is('variant_id', null)
        .single()

      if (existing) {
        // Increment quantity for simple product
        const newQuantity = existing.quantity + quantity

        await supabaseServer
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existing.id)
      } else {
        // Insert new cart item without variant
        // NOTE: This path shouldn't be used since all products should have variants
        // If you have products without variants, you'll need to create a default variant
        return { success: false, error: 'Product must have at least one variant' }
      }
    }

    revalidatePath('/cart')
    return { success: true }
  } catch (error) {
    console.error('addToCart error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/* =========================
   REMOVE FROM CART
========================= */
/* =========================
   REMOVE FROM CART
========================= */
export async function removeFromCart(identifier: string | FormData): Promise<void> {
  const cartItemId = typeof identifier === 'string' ? identifier : (identifier.get('cartItemId') as string)
  const userUid = await ensureUserUid()

  // Rate limit check
  const rateLimitKey = getUserRateLimitKey('cart:remove', userUid)
  const { success: withinLimit } = await rateLimit(rateLimitKey, RATE_LIMITS.CART_MUTATION)
  if (!withinLimit) {
    throw new Error('Too many requests. Please wait a moment and try again.')
  }

  if (!cartItemId) {
    throw new Error('Invalid cart item')
  }

  const { error } = await supabaseServer
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('firebase_uid', userUid)

  if (error) {
    console.error('removeFromCart error:', error)
    throw new Error('Failed to remove item')
  }

  revalidatePath('/cart')
}

/* =========================
   UPDATE CART QUANTITY
========================= */
export async function updateCartQuantity(cartItemId: string, quantity: number): Promise<void> {
  const userUid = await ensureUserUid()

  // Rate limit check
  const rateLimitKey = getUserRateLimitKey('cart:update', userUid)
  const { success: withinLimit } = await rateLimit(rateLimitKey, RATE_LIMITS.CART_MUTATION)
  if (!withinLimit) {
    throw new Error('Too many requests. Please wait a moment and try again.')
  }

  if (quantity < 1) {
    throw new Error('Invalid quantity')
  }

  // Fetch cart item with variant information
  const { data: cartItem, error: fetchError } = await supabaseServer
    .from('cart_items')
    .select(`
      id,
      variant_id
    `)
    .eq('id', cartItemId)
    .eq('firebase_uid', userUid)
    .single()

  if (fetchError || !cartItem) {
    throw new Error('Cart item not found')
  }

  // CRITICAL: Get reservation-aware availability
  const { data: availabilityData, error: availError } = await supabaseServer
    .rpc('get_variant_availability', { variant_ids: [cartItem.variant_id] })

  if (availError || !availabilityData || availabilityData.length === 0) {
    console.error('Failed to fetch availability:', availError)
    throw new Error('Unable to verify stock availability')
  }

  const availability = availabilityData[0]

  // Validate new quantity against reservation-aware stock
  if (availability.available_to_sell < quantity) {
    throw new Error(`Only ${availability.available_to_sell} units available`)
  }

  // Update quantity only if stock check passes
  const { error } = await supabaseServer
    .from('cart_items')
    .update({ quantity })
    .eq('id', cartItemId)
    .eq('firebase_uid', userUid)

  if (error) {
    console.error('updateCartQuantity error:', error)
    throw new Error('Failed to update quantity')
  }

  revalidatePath('/cart')
}

/* =========================
   CLEAR CART (server-side)
========================= */
export async function clearCart(uid: string): Promise<void> {
  const { error } = await supabaseAdmin.from('cart_items').delete().eq('firebase_uid', uid)

  if (error) {
    throw new Error(`Failed to clear cart for user ${uid}: ${error.message}`)
  }
}
/* =========================
   GET GUEST CART DETAILS
========================= */
export async function getGuestCartDetails(items: { productId: string; variantId: string | null; quantity: number }[]): Promise<CartItem[]> {
  const variantIds = items.map(i => i.variantId).filter(Boolean) as string[]
  if (variantIds.length === 0) return []

  const { data, error } = await supabaseServer
    .from('variants')
    .select(`
        id,
        sku,
        size,
        color,
        price_override,
        stock_quantity,
        product_id,
        low_stock_threshold,
        enabled,
        position,
        created_at,
        products:product_id (
          id,
          name,
          slug,
          base_price,
          images,
          image_url,
          is_active,
          created_at,
          category
        )
    `)
    .in('id', variantIds)

  if (error || !data) {
    console.error('getGuestCartDetails error:', error)
    return []
  }

  // Map back to items to preserve quantity and order
  const mapped = items.map(item => {
    const variant = data.find(v => v.id === item.variantId)
    if (!variant || !variant.products) return null

    // Handle array or single product return from join
    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products

    return {
      id: `guest_${item.variantId}`, // Temporary ID for UI keys
      quantity: item.quantity,
      variant_id: item.variantId!,
      product_id: product.id,
      products: product,
      variants: {
        id: variant.id,
        product_id: variant.product_id,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        price_override: variant.price_override,
        stock_quantity: variant.stock_quantity,
        low_stock_threshold: variant.low_stock_threshold || 10,
        enabled: variant.enabled,
        position: variant.position || 0,
        created_at: variant.created_at
      }
    }
  })
  
  return mapped.filter((item): item is NonNullable<typeof item> => item !== null) as CartItem[]
}

/* =========================
   SYNC GUEST CART
========================= */
export async function syncGuestCart(items: { variantId: string; quantity: number }[]) {
  const userUid = await ensureUserUid()
  
  // Early exit if no items to sync
  if (!items.length) return
  
  // Check if sync already happened (one-time sync guard)
  if (typeof window !== 'undefined') {
    const syncKey = `cart_synced_${userUid}`
    if (localStorage.getItem(syncKey)) {
      console.log('[syncGuestCart] Already synced for this user, skipping')
      return
    }
  }

  // Deduplicate guest cart items by variant_id (sum quantities)
  const deduped = new Map<string, number>()
  for (const item of items) {
    const existing = deduped.get(item.variantId) || 0
    deduped.set(item.variantId, existing + item.quantity)
  }

  for (const [variantId, guestQuantity] of deduped) {
    // CRITICAL: Get reservation-aware availability
    const { data: availabilityData, error: availError } = await supabaseServer
      .rpc('get_variant_availability', { variant_ids: [variantId] })

    if (availError || !availabilityData || availabilityData.length === 0) {
      console.warn(`[syncGuestCart] Failed to fetch availability for ${variantId}, skipping`)
      continue
    }

    const availability = availabilityData[0]

    // Check if item already exists in auth cart
    const { data: existing } = await supabaseServer
      .from('cart_items')
      .select('id, quantity')
      .eq('firebase_uid', userUid)
      .eq('variant_id', variantId)
      .single()

    if (existing) {
      // Calculate merged quantity
      const mergedQuantity = existing.quantity + guestQuantity
      
      // Cap at reservation-aware available stock
      const finalQuantity = Math.min(mergedQuantity, availability.available_to_sell)
      
      if (finalQuantity !== mergedQuantity) {
        console.warn(`[syncGuestCart] Variant ${variantId} quantity capped at available: ${availability.available_to_sell}`)
      }

      // Update with capped quantity
      await supabaseServer
        .from('cart_items')
        .update({ quantity: finalQuantity })
        .eq('id', existing.id)
    } else {
      // Cap guest quantity at reservation-aware available stock
      const finalQuantity = Math.min(guestQuantity, availability.available_to_sell)
      
      if (finalQuantity !== guestQuantity) {
        console.warn(`[syncGuestCart] Variant ${variantId} quantity capped at available: ${availability.available_to_sell}`)
      }

      // Insert new with capped quantity
      await supabaseServer.from('cart_items').insert({
        firebase_uid: userUid,
        variant_id: variantId,
        quantity: finalQuantity,
      })
    }
  }
  
  // Note: Guest cart clearing now happens on client-side BEFORE calling this function
  // This prevents race condition with revalidatePath
  
  revalidatePath('/cart')
}
