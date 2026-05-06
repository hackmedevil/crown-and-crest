import { supabaseServer } from '@/lib/supabase/server'

export type ReserveItem = { variantId: string; qty: number }

export async function reserveStock(orderId: string, uid: string, items: ReserveItem[], ttlSeconds = 900) {
  const { data, error } = await supabaseServer.rpc('reserve_stock', {
    p_order_id: orderId,
    p_uid: uid,
    p_items: JSON.stringify(items.map(i => ({ variant_id: i.variantId, qty: i.qty }))),
    p_ttl_seconds: ttlSeconds,
  })
  if (error) throw new Error(error.message)
  return data
}

export async function commitReservation(orderId: string) {
  const { data, error } = await supabaseServer.rpc('commit_reservation', { p_order_id: orderId })
  if (error) throw new Error(error.message)
  return data
}

export async function releaseReservation(orderId: string) {
  const { data, error } = await supabaseServer.rpc('release_reservation', { p_order_id: orderId })
  if (error) throw new Error(error.message)
  return data
}

export async function releaseExpiredReservations() {
  const { data, error } = await supabaseServer.rpc('release_expired_reservations')
  if (error) throw new Error(error.message)
  return data
}
