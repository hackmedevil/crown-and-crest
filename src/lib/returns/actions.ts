'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Return, ReturnWithOrderData, ReturnItem } from '@/types/return'

export async function getUserReturns(uid: string) {
  const { data: returns, error } = await supabaseAdmin
    .from('returns')
    .select('*')
    .eq('firebase_uid', uid)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getUserReturns error:', JSON.stringify(error, null, 2))
    // Return empty array as fallback - table may not exist yet
    return []
  }

  return returns as Return[]
}

export async function getReturnById(returnId: string) {
  const { data: returnData, error } = await supabaseAdmin
    .from('returns')
    .select('*')
    .eq('id', returnId)
    .single()

  if (error) {
    console.error('getReturnById error:', JSON.stringify(error, null, 2))
    throw new Error('Failed to fetch return')
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from('return_items')
    .select('*')
    .eq('return_id', returnId)

  if (itemsError) {
    console.error('getReturnById items error:', JSON.stringify(itemsError, null, 2))
    // Continue without items if query fails
    return {
      ...returnData,
      items: [],
    } as ReturnWithOrderData
  }

  return {
    ...returnData,
    items: items || [],
  } as ReturnWithOrderData
}

export async function getActiveReturns(uid: string) {
  const activeStatuses = ['REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'INSPECTION_PENDING']

  const { data: returns, error } = await supabaseAdmin
    .from('returns')
    .select('*')
    .eq('firebase_uid', uid)
    .in('status', activeStatuses)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getActiveReturns error:', JSON.stringify(error, null, 2))
    // Return empty array as fallback - table may not exist yet
    return []
  }

  return returns as Return[]
}

export async function getCompletedReturns(uid: string) {
  const completedStatuses = ['REFUNDED', 'REJECTED']

  const { data: returns, error } = await supabaseAdmin
    .from('returns')
    .select('*')
    .eq('firebase_uid', uid)
    .in('status', completedStatuses)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('getCompletedReturns error:', JSON.stringify(error, null, 2))
    // Return empty array as fallback - table may not exist yet
    return []
  }

  return returns as Return[]
}

export async function createReturn(
  orderId: string,
  uid: string,
  data: {
    items: Array<{
      order_item_id: string
      quantity: number
      reason: string
    }>
    reason_code: string
    reason_comments?: string
    resolution: string
    refund_method: string
    pickup_address?: any
  }
) {
  // Create return
  const { data: returnData, error: returnError } = await supabaseAdmin
    .from('returns')
    .insert({
      order_id: orderId,
      firebase_uid: uid,
      reason_code: data.reason_code,
      reason_comments: data.reason_comments,
      resolution: data.resolution,
      refund_method: data.refund_method,
      pickup_address: data.pickup_address,
    })
    .select()
    .single()

  if (returnError) {
    console.error('createReturn error:', JSON.stringify(returnError, null, 2))
    throw new Error('Failed to create return: ' + (returnError?.message || 'Unknown error'))
  }

  // Create return items
  const { data: returnItems, error: itemsError } = await supabaseAdmin
    .from('return_items')
    .insert(
      data.items.map((item) => ({
        return_id: returnData.id,
        order_item_id: item.order_item_id,
        quantity: item.quantity,
        reason_for_item: item.reason,
      }))
    )
    .select()

  if (itemsError) {
    console.error('createReturn items error:', JSON.stringify(itemsError, null, 2))
    // Return with empty items array as fallback
    return {
      ...returnData,
      items: [],
    }
  }

  return {
    ...returnData,
    items: returnItems,
  }
}

export async function updateReturnStatus(
  returnId: string,
  status: string,
  data?: Partial<Return>
) {
  const { data: updated, error } = await supabaseAdmin
    .from('returns')
    .update({
      status,
      ...data,
    })
    .eq('id', returnId)
    .select()
    .single()

  if (error) {
    console.error('updateReturnStatus error:', JSON.stringify(error, null, 2))
    throw new Error('Failed to update return status: ' + (error?.message || 'Unknown error'))
  }

  return updated as Return
}

export async function checkOrderEligibleForReturn(orderId: string): Promise<{
  eligible: boolean
  reason?: string
  daysRemaining?: number
}> {
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('created_at, status')
    .eq('id', orderId)
    .single()

  if (error) {
    console.error('checkOrderEligibleForReturn error:', JSON.stringify(error, null, 2))
    return { eligible: false, reason: 'Order not found' }
  }

  // Check if order is delivered
  if (order.status !== 'DELIVERED') {
    return { eligible: false, reason: 'Order must be delivered to initiate return' }
  }

  // Check return window (7 days)
  const RETURN_WINDOW_DAYS = 7
  const orderDate = new Date(order.created_at)
  const now = new Date()
  const daysSinceOrder = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
  const daysRemaining = Math.ceil(RETURN_WINDOW_DAYS - daysSinceOrder)

  if (daysSinceOrder > RETURN_WINDOW_DAYS) {
    return { eligible: false, reason: 'Return window has expired' }
  }

  return { eligible: true, daysRemaining }
}

export async function getReturnablItems(orderId: string) {
  const { data: items, error } = await supabaseAdmin
    .from('order_items')
    .select(
      `
      *,
      existing_returns:return_items!order_item_id(quantity)
    `
    )
    .eq('order_id', orderId)

  if (error) {
    console.error('getReturnableItems error:', JSON.stringify(error, null, 2))
    // Try simple query without joins as fallback
    const { data: simpleItems, error: simpleError } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (simpleError) {
      console.error('getReturnableItems simple query error:', JSON.stringify(simpleError, null, 2))
      return []
    }

    return simpleItems || []
  }

  return items || []
}
