'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import type { AccountMetrics } from '@/lib/account/types'

const REWARDS_POINTS_DIVISOR = 100
const PAID_STATUSES = ['PAID', 'FULFILLMENT_PENDING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED']
const ACTIVE_STATUSES = ['CREATED', 'PAYMENT_PENDING', 'PAID', 'FULFILLMENT_PENDING', 'SHIPPED', 'OUT_FOR_DELIVERY']

export async function getAccountMetrics(uid: string): Promise<AccountMetrics> {
  const [ordersCountResult, spendResult, activeOrdersResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('firebase_uid', uid),
    supabaseAdmin
      .from('orders')
      .select('amount')
      .eq('firebase_uid', uid)
      .in('status', PAID_STATUSES),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('firebase_uid', uid)
      .in('status', ACTIVE_STATUSES),
  ])

  const totalSpend = (spendResult.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const rewardsPoints = Math.floor(totalSpend / REWARDS_POINTS_DIVISOR)

  return {
    ordersCount: ordersCountResult.count ?? 0,
    totalSpend,
    rewardsPoints,
    activeOrderCount: activeOrdersResult.count ?? 0,
  }
}
