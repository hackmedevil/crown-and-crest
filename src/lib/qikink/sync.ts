// Qikink Sync Engine
// Fetches Qikink orders, matches to local DB orders, updates tracking + status,
// and triggers customer SMS notifications on key status transitions.

import { supabaseAdmin } from '@/lib/supabase/admin'
import { fetchQikinkOrders } from './client'
import { QIKINK_STATUS_MAP, QikinkSyncResult } from './types'
import { sendSMS } from '@/lib/sms/sms'
import { generateSMSMessage } from '@/lib/sms/templates'

type NotifiableStatus = 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
const NOTIFIABLE_STATUSES = new Set<string>(['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'])

const ACTIVE_STATUSES = ['SENT_TO_PROVIDER', 'IN_PRODUCTION', 'SHIPPED', 'OUT_FOR_DELIVERY']

function appendTimeline(existing: unknown, event: Record<string, unknown>) {
  const current = Array.isArray(existing) ? existing : []
  return [...current, event]
}

/**
 * Run a full Qikink sync:
 *   1. Load all locally active Qikink orders.
 *   2. Fetch all orders from Qikink API.
 *   3. Match by provider_order_id (fallback: order_number).
 *   4. Update tracking + status in DB when changed.
 *   5. Trigger SMS for SHIPPED / OUT_FOR_DELIVERY / DELIVERED transitions.
 */
export async function performQikinkSync(): Promise<{
  processed: number
  updated: number
  results: QikinkSyncResult[]
}> {
  // 1. Load active local orders (those that have been sent to Qikink)
  const { data: activeOrders, error: dbError } = await supabaseAdmin
    .from('orders')
    .select(
      'id, order_number, status, provider_order_id, tracking_id, tracking_url, courier, customer_phone, order_timeline, amount'
    )
    .eq('provider', 'qikink')
    .in('status', ACTIVE_STATUSES)

  if (dbError) {
    throw new Error(`Failed to load active orders: ${dbError.message}`)
  }

  if (!activeOrders || activeOrders.length === 0) {
    return { processed: 0, updated: 0, results: [] }
  }

  // Build lookup maps for O(1) matching
  const byProviderOrderId = new Map<string, (typeof activeOrders)[number]>()
  const byOrderNumber = new Map<string, (typeof activeOrders)[number]>()
  for (const order of activeOrders) {
    if (order.provider_order_id) {
      byProviderOrderId.set(String(order.provider_order_id), order)
    }
    if (order.order_number) {
      byOrderNumber.set(order.order_number, order)
    }
  }

  // 2. Fetch all orders from Qikink
  const qikinkOrders = await fetchQikinkOrders()

  const results: QikinkSyncResult[] = []
  let updatedCount = 0

  // 3. Process each Qikink order
  for (const qikinkOrder of qikinkOrders) {
    const qikinkOrderIdStr = String(qikinkOrder.order_id)

    // Match: provider_order_id first, then order_number
    const localOrder =
      byProviderOrderId.get(qikinkOrderIdStr) ?? byOrderNumber.get(qikinkOrder.number)

    if (!localOrder) {
      // Not one of our active orders – skip silently
      continue
    }

    const result: QikinkSyncResult = {
      qikink_order_id: qikinkOrder.order_id,
      order_number: qikinkOrder.number,
      matched_order_id: localOrder.id,
      previous_status: localOrder.status,
      new_status: null,
      status_updated: false,
      tracking_updated: false,
      notification_sent: false,
    }

    const mappedStatus = QIKINK_STATUS_MAP[qikinkOrder.status] ?? null
    const newTracking = qikinkOrder.shipping?.awb ?? null
    const newTrackingUrl = qikinkOrder.shipping?.tracking_link ?? null
    const newCourier = qikinkOrder.shipping?.courier ?? null

    const statusChanged = mappedStatus && mappedStatus !== localOrder.status
    const trackingChanged =
      (newTracking && newTracking !== localOrder.tracking_id) ||
      (newTrackingUrl && newTrackingUrl !== localOrder.tracking_url)

    if (!statusChanged && !trackingChanged) {
      results.push(result)
      continue
    }

    // 4. Build DB patch
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (statusChanged) {
      patch.status = mappedStatus
      result.new_status = mappedStatus
      result.status_updated = true
    }

    if (trackingChanged) {
      if (newTracking) patch.tracking_id = newTracking
      if (newTrackingUrl) patch.tracking_url = newTrackingUrl
      if (newCourier) {
        patch.courier = newCourier
        patch.courier_name = newCourier
      }
      result.tracking_updated = true
    }

    // Append timeline event
    const timelineEvent = {
      id: crypto.randomUUID(),
      event_type: 'QIKINK_SYNC',
      previous_status: localOrder.status,
      next_status: mappedStatus ?? localOrder.status,
      actor_type: 'SYSTEM',
      created_at: new Date().toISOString(),
      metadata: {
        qikink_order_id: qikinkOrder.order_id,
        qikink_status: qikinkOrder.status,
        tracking_id: newTracking,
        tracking_url: newTrackingUrl,
        courier: newCourier,
      },
    }
    patch.order_timeline = appendTimeline(localOrder.order_timeline, timelineEvent)

    // Apply DB update
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(patch)
      .eq('id', localOrder.id)

    if (updateError) {
      result.error = updateError.message
      results.push(result)
      continue
    }

    updatedCount++

    // 5. Trigger SMS notification for key status transitions
    const targetStatus = (mappedStatus ?? localOrder.status) as string
    if (statusChanged && NOTIFIABLE_STATUSES.has(targetStatus) && localOrder.customer_phone) {
      try {
        const notificationType = targetStatus as NotifiableStatus

        const templateData = {
          orderId: localOrder.order_number ?? localOrder.id,
          amount: localOrder.amount as number | undefined,
          courier: (newCourier ?? localOrder.courier) ?? undefined,
          trackingId: newTracking ?? localOrder.tracking_id ?? undefined,
          trackingUrl: newTrackingUrl ?? localOrder.tracking_url ?? undefined,
        }

        const message = generateSMSMessage(notificationType, templateData)

        await sendSMS({
          phone: localOrder.customer_phone,
          message,
          notificationType,
          orderId: localOrder.id,
        })

        result.notification_sent = true
      } catch (smsErr) {
        // Notifications are non-critical – log but don't fail sync
        console.error('[QIKINK_SYNC] SMS error for order', localOrder.id, smsErr)
      }
    }

    results.push(result)
  }

  return {
    processed: qikinkOrders.length,
    updated: updatedCount,
    results,
  }
}
