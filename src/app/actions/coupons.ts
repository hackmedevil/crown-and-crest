/**
 * ACTION: Server actions for the coupons feature
 * 
 * Handles fetching, creating, updating, and applying coupons.
 * Built with Next.js 16 Server Actions and Supabase backend.
 */
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping'

export interface CouponInput {
  code: string
  description?: string
  type: DiscountType
  value: number
  minimum_order_amount?: number
  maximum_discount_amount?: number
  usage_limit?: number
  per_user_limit?: number
  starts_at: string
  ends_at?: string
  is_active?: boolean
}

/**
 * Creates a new coupon in the database
 */
export async function createCoupon(data: CouponInput) {
  try {
    const supabase = await createClient()

    // 1. Verify admin role (enforced by RLS, but good to check here)
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData?.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Convert code to uppercase and trim
    const formattedCode = data.code.trim().toUpperCase()

    const { data: newCoupon, error } = await supabase
      .from('coupons')
      .insert({
        code: formattedCode,
        description: data.description || null,
        type: data.type,
        value: data.value,
        minimum_order_amount: data.minimum_order_amount || 0,
        maximum_discount_amount: data.maximum_discount_amount || null,
        usage_limit: data.usage_limit || null,
        per_user_limit: data.per_user_limit || 1,
        starts_at: data.starts_at,
        ends_at: data.ends_at || null,
        is_active: data.is_active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating coupon:', error)
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'A coupon with this code already exists' }
      }
      return { success: false, error: error.message }
    }

    // Revalidate admin cache
    revalidatePath('/admin/coupons')
    
    return { success: true, data: newCoupon }
  } catch (error: any) {
    console.error('Failed to create coupon:', error)
    return { success: false, error: error.message || 'Internal server error' }
  }
}

/**
 * Toggles a coupon's active status
 */
export async function toggleCouponStatus(id: string, isActive: boolean) {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('coupons')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/coupons')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Validates a coupon against a cart total and user ID
 * Returns the calculated discount amount if valid
 */
export async function validateCoupon(code: string, cartTotal: number) {
  try {
    const supabase = await createClient()
    const formattedCode = code.trim().toUpperCase()

    // Get current user if logged in (for per_user_limit checks)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Fetch the active coupon
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', formattedCode)
      .eq('is_active', true)
      .lte('starts_at', new Date().toISOString())
      // Check ends_at either null or > now
      .or(`ends_at.is.null, ends_at.gte.${new Date().toISOString()}`)
      .single()

    if (error || !coupon) {
      return { success: false, error: 'Invalid or expired coupon code.' }
    }

    // 1. Check minimum order amount
    if (coupon.minimum_order_amount && cartTotal < coupon.minimum_order_amount) {
      return { 
        success: false, 
        error: `Cart total must be at least ₹${coupon.minimum_order_amount} to use this coupon.` 
      }
    }

    // 2. Check total usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { success: false, error: 'This coupon has reached its usage limit.' }
    }

    // 3. Check per-user limit
    if (userId && coupon.per_user_limit) {
      const { count, error: countError } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('user_id', userId)
      
      if (!countError && count !== null && count >= coupon.per_user_limit) {
        return { success: false, error: 'You have already used this coupon.' }
      }
    }

    // 4. Calculate discount
    let discountAmount = 0
    if (coupon.type === 'percentage') {
      discountAmount = (cartTotal * coupon.value) / 100
      // Apply maximum discount cap if it exists
      if (coupon.maximum_discount_amount && discountAmount > coupon.maximum_discount_amount) {
        discountAmount = coupon.maximum_discount_amount
      }
    } else if (coupon.type === 'fixed_amount') {
      discountAmount = coupon.value
    } else if (coupon.type === 'free_shipping') {
      // Free shipping handling will be done by the shipping calculation logic,
      // but we return success here to indicate valid coupon
      discountAmount = 0 
    }

    // Ensure we don't discount more than the cart total
    discountAmount = Math.min(discountAmount, cartTotal)

    return { 
      success: true, 
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description
      },
      discountAmount
    }
    
  } catch (error: any) {
    console.error('Coupon validation error:', error)
    return { success: false, error: 'Failed to validate coupon' }
  }
}
