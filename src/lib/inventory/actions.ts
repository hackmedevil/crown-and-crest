'use server'

// User-side inventory management actions wrapping RPC functions.
// These handle stock reservations during checkout flow.
//
// Flow:
// 1. reserve_stock: Called when order created, before Razorpay modal opens
//    - Atomically decrements stock_quantity
//    - Creates reservation records with 15min expiry
//    - All-or-nothing (if ANY item out of stock, entire transaction rolls back)
//
// 2. commit_reservation: Called on payment success (verify handler)
//    - Marks reservations as 'committed'
//    - Finalizes the inventory deduction
//    - Idempotent (safe to call multiple times)
//
// 3. release_reservation: Called on payment failure/cancel/timeout
//    - Marks reservations as 'released'
//    - Restores stock_quantity
//    - Used when user closes Razorpay modal or payment fails
//
// FUTURE: Add cron job to auto-release expired reservations
// See: ADMIN_INVENTORY_CONCURRENCY.md for detailed flow

import { supabaseAdmin } from '@/lib/supabase/admin'
import { trackInventoryError } from '@/lib/observability/errorTracking'
import { logInfo, logError, logWarn } from '@/lib/observability/structuredLogging'

export type ReserveResult = { ok: boolean; reserved?: number }
export type CommitResult = { ok: boolean; committed?: number }
export type ReleaseResult = { ok: boolean; released?: number }

/**
 * Reserve stock for an order (called during order creation)
 * @param orderId - UUID of the order
 * @param uid - Firebase UID of the user
 * @param items - Array of { variant_id, qty } objects
 * @param ttlSeconds - Reservation TTL in seconds (default: 900 = 15 minutes)
 * @returns { ok: true, reserved: count } on success
 * @throws Error with 'OUT_OF_STOCK' message if any variant has insufficient stock
 */
export async function reserveStockForOrder(
  orderId: string,
  uid: string,
  items: Array<{ variant_id: string; qty: number }>,
  ttlSeconds: number = 900
): Promise<ReserveResult> {
  logInfo.cronExecutionStart(`reserve_stock_${orderId}`)

  const { data, error } = await supabaseAdmin.rpc('reserve_stock', {
    p_order_id: orderId,
    p_uid: uid,
    p_items: JSON.stringify(items),
    p_ttl_seconds: ttlSeconds,
  })
  
  if (error) {
    logError.cronExecutionFailed(`reserve_stock_${orderId}`, error.message, 0)

    await trackInventoryError(error, 'reserve', undefined, {
      orderId,
      userId: uid,
      itemCount: items.length,
    })
    throw error
  }
  
  logInfo.cronExecutionComplete(`reserve_stock_${orderId}`, 0, items.length)

  return data as ReserveResult
}

/**
 * Commit reservations for an order (called on payment success)
 * @param orderId - UUID of the order
 * @returns { ok: true, committed: count } on success
 * @throws Error if no reservations found or already committed
 */
export async function commitReservationForOrder(orderId: string): Promise<CommitResult> {
  logInfo.cronExecutionStart(`commit_reservation_${orderId}`)

  const { data, error } = await supabaseAdmin.rpc('commit_reservation', {
    p_order_id: orderId,
  })
  
  if (error) {
    logError.cronExecutionFailed(`commit_reservation_${orderId}`, error.message, 0)

    await trackInventoryError(error, 'commit', undefined, {
      orderId,
    })
    throw error
  }
  
  logInfo.cronExecutionComplete(`commit_reservation_${orderId}`, 0, data?.committed || 0)

  return data as CommitResult
}

/**
 * Release reservations for an order (called on payment failure/cancel)
 * @param orderId - UUID of the order
 * @returns { ok: true, released: count } on success
 */
export async function releaseReservationForOrder(orderId: string): Promise<ReleaseResult> {
  logInfo.cronExecutionStart(`release_reservation_${orderId}`)

  const { data, error } = await supabaseAdmin.rpc('release_reservation', {
    p_order_id: orderId,
  })
  
  if (error) {
    logWarn.inventoryReleaseRetry(orderId, 1, error.message)

    await trackInventoryError(error, 'release', undefined, {
      orderId,
    })
    throw error
  }
  
  logInfo.cronExecutionComplete(`release_reservation_${orderId}`, 0, data?.released || 0)

  return data as ReleaseResult
}

// DEPRECATED: Legacy single-variant reservation functions
// Use the *ForOrder variants above for new code
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function reserveStock(_variantId: string, _qty: number): Promise<ReserveResult> {
  console.warn('reserveStock is deprecated. Use reserveStockForOrder instead.')
  // This would need an order_id, so it's not directly usable
  throw new Error('Use reserveStockForOrder instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function commitReservation(_reservationId: string): Promise<CommitResult> {
  console.warn('commitReservation is deprecated. Use commitReservationForOrder instead.')
  throw new Error('Use commitReservationForOrder instead')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function releaseReservation(_reservationId: string): Promise<ReleaseResult> {
  console.warn('releaseReservation is deprecated. Use releaseReservationForOrder instead.')
  throw new Error('Use releaseReservationForOrder instead')
}
