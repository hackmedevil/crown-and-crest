'use server'

import { supabaseServer } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { OrderItemFeedback, FeedbackType } from '@/types/order'

/**
 * Get order item with product details for feedback context
 */
export async function getOrderItemForFeedback(itemId: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized: User not logged in')
  }

  // Fetch order item with order verification
  const { data: orderItem, error: itemError } = await supabaseServer
    .from('order_items')
    .select(
      `
      *,
      order_id
    `
    )
    .eq('id', itemId)
    .maybeSingle()

  if (itemError || !orderItem) {
    throw new Error('Order item not found')
  }

  // Verify user owns this order
  const { data: order, error: orderError } = await supabaseServer
    .from('orders')
    .select('firebase_uid, status')
    .eq('id', orderItem.order_id)
    .maybeSingle()

  if (orderError || !order || order.firebase_uid !== user.uid) {
    throw new Error('Unauthorized: You do not own this order')
  }

  return {
    item: orderItem,
    order_status: order.status,
  }
}

/**
 * Get existing feedback for an order item (if any)
 */
export async function getFeedbackForOrderItem(
  itemId: string
): Promise<OrderItemFeedback | null> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized: User not logged in')
  }

  // Verify ownership first
  await getOrderItemForFeedback(itemId)

  const { data: feedback, error } = await supabaseServer
    .from('order_item_feedback')
    .select('*')
    .eq('order_item_id', itemId)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    throw error
  }

  return feedback || null
}

/**
 * Save feedback for an order item
 * - Creates new feedback if doesn't exist
 * - Updates existing feedback
 * - Triggers fit stats update and learning logic
 */
export async function saveFeedback(
  itemId: string,
  feedbackType: FeedbackType,
  notes?: string
): Promise<OrderItemFeedback> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized: User not logged in')
  }

  // Validate feedback type
  const validTypes: FeedbackType[] = [
    'TOO_SMALL',
    'TOO_LARGE',
    'FITS_WELL',
    'QUALITY_ISSUE',
    'OTHER',
  ]
  if (!validTypes.includes(feedbackType)) {
    throw new Error(`Invalid feedback type: ${feedbackType}`)
  }

  // Verify user owns this order item and get details
  const { item: orderItem } = await getOrderItemForFeedback(itemId)

  // Get order details for context (what was recommended vs selected)
  const { data: product, error: productError } = await supabaseServer
    .from('products')
    .select('id')
    .eq('id', orderItem.product_id)
    .maybeSingle()

  if (productError || !product) {
    throw new Error('Product not found')
  }

  // Get Sizebook recommendation context if available
  const recommendationContext: {
    size_profile_id: string | null
    recommended_size: string | null
  } = {
    size_profile_id: null,
    recommended_size: null,
  }

  // Extract category from product size profiles (if Sizebook was enabled)
  const { data: productSizeProfiles } = await supabaseServer
    .from('product_size_profiles')
    .select('size_profile_id, size_profiles!inner(id, name)')
    .eq('product_id', orderItem.product_id)
    .limit(1)

  // For now, just note that this feedback is tied to order_item_variant (selected_size)
  // In a real scenario, you'd fetch the recommendation that was shown at purchase time
  // For Phase 16, we'll assume the variant name in order_item.variant_label is the selected size

  // Upsert feedback (one per order item)
  const { data: feedback, error: upsertError } = await supabaseServer
    .from('order_item_feedback')
    .upsert(
      {
        order_item_id: itemId,
        user_uid: user.uid,
        size_profile_id: recommendationContext.size_profile_id,
        recommended_size: recommendationContext.recommended_size,
        selected_size: orderItem.variant_label || 'UNKNOWN',
        feedback_type: feedbackType,
        notes: notes?.trim() || null,
      },
      {
        onConflict: 'order_item_id',
      }
    )
    .select()
    .single()

  if (upsertError) {
    throw new Error(`Failed to save feedback: ${upsertError.message}`)
  }

  // Trigger learning logic (async, fires background job)
  // This will:
  // 1. Update fit stats
  // 2. Compute adjustments if thresholds met
  // 3. Log adjustment history
  // Fire and forget - don't block on completion
  updateFitStatsFromFeedback(feedback.id).catch((err) => {
    console.error('[Sizebook Learning] Failed to update fit stats:', err)
  })

  return feedback
}

/**
 * Internal: Update fit stats based on feedback
 * This is called after feedback is saved
 * Runs learning logic to adjust size profiles
 */
async function updateFitStatsFromFeedback(feedbackId: string) {
  try {
    // Fetch the feedback
    const { data: feedback, error: fetchError } = await supabaseServer
      .from('order_item_feedback')
      .select('*')
      .eq('id', feedbackId)
      .single()

    if (fetchError || !feedback) {
      throw new Error('Feedback not found for learning')
    }

    // If feedback has no size profile, skip learning (no Sizebook context)
    if (!feedback.size_profile_id) {
      return
    }

    // Fetch size profile to get category
    const { data: sizeProfile, error: profileError } = await supabaseServer
      .from('size_profiles')
      .select('id, category, measurements')
      .eq('id', feedback.size_profile_id)
      .single()

    if (profileError || !sizeProfile) {
      throw new Error('Size profile not found')
    }

    // Get all metrics for this profile's category
    const metrics = Object.keys(sizeProfile.measurements || {})

    // For each metric, increment the fit stat counter
    for (const metric of metrics) {
      const { error: updateError } = await supabaseServer.rpc(
        'increment_fit_stat',
        {
          p_size_profile_id: feedback.size_profile_id,
          p_metric: metric,
          p_feedback_type: feedback.feedback_type,
        }
      )

      if (updateError) {
        console.error(
          `[Sizebook Learning] Failed to increment stat for ${metric}:`,
          updateError
        )
      }
    }

    // Check if adjustments should be made (sample size ≥ 10)
    // This is handled by a separate admin function (see admin/feedback.ts)
    // For now, just log that stats were updated
    console.log(
      `[Sizebook Learning] Updated fit stats for profile ${feedback.size_profile_id}`
    )
  } catch (err) {
    console.error('[Sizebook Learning] Error in updateFitStatsFromFeedback:', err)
    throw err
  }
}

/**
 * Delete feedback (user can delete their own feedback)
 */
export async function deleteFeedback(feedbackId: string): Promise<void> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized: User not logged in')
  }

  // Verify ownership
  const { data: feedback, error: fetchError } = await supabaseServer
    .from('order_item_feedback')
    .select('user_uid')
    .eq('id', feedbackId)
    .single()

  if (fetchError || !feedback || feedback.user_uid !== user.uid) {
    throw new Error('Unauthorized: You do not own this feedback')
  }

  // Delete
  const { error: deleteError } = await supabaseServer
    .from('order_item_feedback')
    .delete()
    .eq('id', feedbackId)

  if (deleteError) {
    throw new Error(`Failed to delete feedback: ${deleteError.message}`)
  }
}
