// Admin Order Management Actions
// Server-only functions for order status updates and bulk operations

'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus } from '@/types/order'
import { createShipment } from '@/lib/shiprocket/shipment'
import { getTrackingDetails } from '@/lib/shiprocket/shipment'
import { ensureSupplierConfig } from '@/lib/shipping/provider-config'
import { createSupplierOrder } from '@/lib/shipping/supplier-provider'

/**
 * Verify user has admin permissions
 */
async function requireAdmin(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const adminUids = process.env.ADMIN_UIDS?.split(',') || []
  if (!adminUids.includes(user.uid)) {
    throw new Error('Forbidden: Admin access required')
  }

  return user.uid
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    const { error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(), 
      })
      .eq('id', orderId)

    if (error) {
      console.error('[ADMIN] Error updating order status:', error)
      return { success: false, error: error.message }
    }

    console.log('[ADMIN] Order status updated:', orderId, newStatus)
    return { success: true }

  } catch (error: unknown) {
    console.error('[ADMIN] requireAdmin failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

/**
 * Bulk update order status
 */
export async function bulkUpdateOrderStatus(
  orderIds: string[],
  newStatus: OrderStatus
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    await requireAdmin()

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .in('id', orderIds)
      .select('id')

    if (error) {
      console.error('[ADMIN] Error in bulk update:', error)
      return { success: false, count: 0, error: error.message }
    }

    const count = data?.length || 0
    console.log('[ADMIN] Bulk status update:', count, 'orders to', newStatus)
    
    return { success: true, count }

  } catch (error: unknown) {
    console.error('[ADMIN] requireAdmin failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, count: 0, error: errorMessage }
  }
}

/**
 * Create Shiprocket shipment for an order
 */
export async function createShipmentForOrder(
  orderId: string
): Promise<{ success: boolean; error?: string; shipmentId?: number; awb?: string; provider?: string; orderReference?: string }> {
  try {
    await requireAdmin()

    // Check if shipment already exists
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('shiprocket_shipment_id, tracking_id, courier_name, shipment_status')
      .eq('id', orderId)
      .single()

    if (order?.shiprocket_shipment_id || order?.tracking_id || order?.courier_name || order?.shipment_status) {
      return {
        success: false,
        error: 'Shipment already created for this order',
      }
    }

    let supplierConfig: Record<string, unknown> | null = null
    let fallbackToShiprocket = true

    try {
      supplierConfig = (await ensureSupplierConfig()) as unknown as Record<string, unknown>
      const supplierOperationalConfig =
        supplierConfig.operational_config && typeof supplierConfig.operational_config === 'object'
          ? (supplierConfig.operational_config as Record<string, unknown>)
          : {}
      fallbackToShiprocket = supplierOperationalConfig.fallback_to_shiprocket !== false
    } catch (configError) {
      console.warn('[ADMIN] Supplier config unavailable, defaulting to Shiprocket:', configError)
    }

    if (supplierConfig?.is_enabled) {
      try {
        const supplierOrder = await createSupplierOrder(orderId)

        return {
          success: true,
          provider: supplierOrder.providerName,
          orderReference: supplierOrder.orderNumber,
        }
      } catch (supplierError) {
        console.error('[ADMIN] Supplier fulfillment failed:', supplierError)

        if (!fallbackToShiprocket) {
          const errorMessage = supplierError instanceof Error ? supplierError.message : 'Supplier fulfillment failed'
          return {
            success: false,
            error: errorMessage,
          }
        }
      }
    }

    // Create shipment
    const shipment = await createShipment(orderId)

    console.log('[ADMIN] Shipment created:', shipment.shipmentId)
    
    return {
      success: true,
      shipmentId: shipment.shipmentId,
      awb: shipment.awbCode || undefined,
      provider: 'Shiprocket',
    }

  } catch (error: unknown) {
    console.error('[ADMIN] Error creating shipment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

/**
 * Refresh tracking info for an order
 */
export async function refreshTrackingInfo(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()

    // Get order AWB
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('tracking_id')
      .eq('id', orderId)
      .single()

    if (!order?.tracking_id) {
      return { success: false, error: 'No tracking ID found' }
    }

    // Fetch latest tracking data
    const trackingData = await getTrackingDetails(order.tracking_id)

    if (!trackingData) {
      return { success: false, error: 'Failed to fetch tracking data' }
    }

    // Update order with latest tracking info
    const latestActivity = trackingData.tracking_data.shipment_track_activities[0]
    
    await supabaseAdmin
      .from('orders')
      .update({
        shipment_status: latestActivity?.sr_status_label || 'IN_TRANSIT',
        last_tracking_update: new Date().toISOString(),
      })
      .eq('id', orderId)

    console.log('[ADMIN] Tracking info refreshed for:', orderId)
    
    return { success: true }

  } catch (error: unknown) {
    console.error('[ADMIN] Error refreshing tracking:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: errorMessage }
  }
}

type AdminRazorpayLogLevel = 'info' | 'warn' | 'error'

interface AdminRazorpayLogEntry {
  time: string
  level: AdminRazorpayLogLevel
  message: string
}

function createAdminRazorpayLog(
  level: AdminRazorpayLogLevel,
  message: string
): AdminRazorpayLogEntry {
  return {
    time: new Date().toISOString(),
    level,
    message,
  }
}

/**
 * Fetch latest Razorpay order/payment payloads for admin debugging in payment tab
 */
export async function fetchRazorpayPaymentLog(orderId: string): Promise<{
  success: boolean
  error?: string
  logs: AdminRazorpayLogEntry[]
  razorpayOrder?: unknown
  razorpayPayment?: unknown
}> {
  const logs: AdminRazorpayLogEntry[] = []

  try {
    await requireAdmin()
    logs.push(createAdminRazorpayLog('info', `Starting Razorpay fetch for order ${orderId}`))

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, razorpay_order_id, razorpay_payment_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      logs.push(createAdminRazorpayLog('error', 'Order lookup failed'))
      return {
        success: false,
        error: orderError?.message || 'Order not found',
        logs,
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID?.trim() || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim()
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim()

    if (!keyId || !keySecret) {
      logs.push(createAdminRazorpayLog('error', 'Missing Razorpay credentials on server'))
      return {
        success: false,
        error: 'Razorpay credentials are not configured',
        logs,
      }
    }

    if (!order.razorpay_order_id && !order.razorpay_payment_id) {
      logs.push(createAdminRazorpayLog('warn', 'No Razorpay IDs found on order'))
      return {
        success: false,
        error: 'No Razorpay order/payment ID found for this order',
        logs,
      }
    }

    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    let razorpayOrder: unknown
    let razorpayPayment: unknown

    if (order.razorpay_order_id) {
      logs.push(createAdminRazorpayLog('info', `Fetching Razorpay order ${order.razorpay_order_id}`))
      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${order.razorpay_order_id}`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      })

      if (orderResponse.ok) {
        razorpayOrder = await orderResponse.json()
        logs.push(createAdminRazorpayLog('info', 'Razorpay order fetch successful'))
      } else {
        const errorPayload = await orderResponse.text().catch(() => '')
        logs.push(
          createAdminRazorpayLog(
            'warn',
            `Razorpay order fetch failed (${orderResponse.status}): ${errorPayload || orderResponse.statusText}`
          )
        )
      }
    }

    if (order.razorpay_payment_id) {
      logs.push(createAdminRazorpayLog('info', `Fetching Razorpay payment ${order.razorpay_payment_id}`))
      const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}`, {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      })

      if (paymentResponse.ok) {
        razorpayPayment = await paymentResponse.json()
        logs.push(createAdminRazorpayLog('info', 'Razorpay payment fetch successful'))
      } else {
        const errorPayload = await paymentResponse.text().catch(() => '')
        logs.push(
          createAdminRazorpayLog(
            'warn',
            `Razorpay payment fetch failed (${paymentResponse.status}): ${errorPayload || paymentResponse.statusText}`
          )
        )
      }
    }

    if (!razorpayOrder && !razorpayPayment) {
      logs.push(createAdminRazorpayLog('warn', 'Razorpay responded but no payload could be resolved'))
      return {
        success: false,
        error: 'Unable to fetch Razorpay order/payment payloads',
        logs,
      }
    }

    logs.push(createAdminRazorpayLog('info', 'Razorpay fetch completed'))
    return {
      success: true,
      logs,
      razorpayOrder,
      razorpayPayment,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logs.push(createAdminRazorpayLog('error', `Fetch failed: ${errorMessage}`))
    return {
      success: false,
      error: errorMessage,
      logs,
    }
  }
}

interface RazorpayAddressPayload {
  line1?: string
  line2?: string
  city?: string
  state?: string
  zipcode?: string
  postal_code?: string
  country?: string
}

interface RazorpayCustomerPayload {
  name?: string
  email?: string
  contact?: string
  shipping_address?: RazorpayAddressPayload
}

function extractAddressFromRazorpayPayload(
  razorpayOrder: any,
  razorpayPayment: any,
  fallbackName?: string
) {
  const orderCustomer = razorpayOrder?.customer_details as RazorpayCustomerPayload | undefined
  const paymentCustomer = razorpayPayment?.customer_details as RazorpayCustomerPayload | undefined
  const directOrderAddress = razorpayOrder?.shipping_address as RazorpayAddressPayload | undefined

  const address =
    orderCustomer?.shipping_address ||
    paymentCustomer?.shipping_address ||
    directOrderAddress

  if (!address) {
    return null
  }

  return {
    fullName: orderCustomer?.name || paymentCustomer?.name || fallbackName || '',
    addressLine1: address.line1 || '',
    addressLine2: address.line2 || '',
    city: address.city || '',
    state: address.state || '',
    pincode: address.zipcode || address.postal_code || '',
    country: address.country || 'India',
  }
}

/**
 * Admin recovery utility: fetch Razorpay payload and sync customer details to orders table.
 */
export async function syncRazorpayCustomerDetails(orderId: string): Promise<{
  success: boolean
  error?: string
  logs: AdminRazorpayLogEntry[]
  updatedFields?: string[]
}> {
  const logs: AdminRazorpayLogEntry[] = []

  try {
    await requireAdmin()
    logs.push(createAdminRazorpayLog('info', `Starting customer detail sync for order ${orderId}`))

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, razorpay_order_id, razorpay_payment_id, customer_email, customer_phone, shipping_address')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      logs.push(createAdminRazorpayLog('error', 'Order lookup failed'))
      return {
        success: false,
        error: orderError?.message || 'Order not found',
        logs,
      }
    }

    const fetchResult = await fetchRazorpayPaymentLog(orderId)
    logs.push(...fetchResult.logs)

    if (!fetchResult.success) {
      return {
        success: false,
        error: fetchResult.error || 'Failed to fetch Razorpay payloads',
        logs,
      }
    }

    const razorpayOrder = fetchResult.razorpayOrder as any
    const razorpayPayment = fetchResult.razorpayPayment as any

    const customerName =
      razorpayOrder?.customer_details?.name ||
      razorpayPayment?.customer_details?.name ||
      undefined

    const customerEmail =
      razorpayOrder?.customer_details?.email ||
      razorpayPayment?.customer_details?.email ||
      undefined

    const customerPhone =
      razorpayOrder?.customer_details?.contact ||
      razorpayPayment?.customer_details?.contact ||
      razorpayPayment?.contact ||
      undefined

    const shippingAddress = extractAddressFromRazorpayPayload(razorpayOrder, razorpayPayment, customerName)

    const updatePayload: Record<string, unknown> = {}
    const updatedFields: string[] = []

    if (customerEmail) {
      updatePayload.customer_email = customerEmail
      updatedFields.push('customer_email')
    }
    if (customerPhone) {
      updatePayload.customer_phone = customerPhone
      updatedFields.push('customer_phone')
    }
    if (shippingAddress) {
      updatePayload.shipping_address = shippingAddress
      updatedFields.push('shipping_address')
    }

    if (Object.keys(updatePayload).length === 0) {
      logs.push(createAdminRazorpayLog('warn', 'No customer fields available in Razorpay payload'))
      return {
        success: false,
        error: 'No customer details found in Razorpay payload',
        logs,
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)

    if (updateError) {
      logs.push(createAdminRazorpayLog('error', `Orders update failed: ${updateError.message}`))
      return {
        success: false,
        error: updateError.message,
        logs,
      }
    }

    if (customerName) {
      const { error: nameUpdateError } = await supabaseAdmin
        .from('orders')
        .update({ customer_name: customerName })
        .eq('id', orderId)

      if (!nameUpdateError) {
        updatedFields.push('customer_name')
      } else {
        logs.push(createAdminRazorpayLog('warn', `customer_name not saved: ${nameUpdateError.message}`))
      }
    }

    logs.push(createAdminRazorpayLog('info', `Synced fields: ${updatedFields.join(', ')}`))
    return {
      success: true,
      logs,
      updatedFields,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logs.push(createAdminRazorpayLog('error', `Sync failed: ${errorMessage}`))
    return {
      success: false,
      error: errorMessage,
      logs,
    }
  }
}

/**
 * Bulk backfill customer details for recent paid/COD orders missing customer fields.
 */
export async function bulkSyncRazorpayCustomerDetails(limit = 30): Promise<{
  success: boolean
  logs: AdminRazorpayLogEntry[]
  processed: number
  succeeded: number
  failed: number
  failedOrderIds: string[]
}> {
  const logs: AdminRazorpayLogEntry[] = []

  try {
    await requireAdmin()
    const safeLimit = Math.min(Math.max(limit, 1), 100)

    logs.push(createAdminRazorpayLog('info', `Starting bulk sync (limit=${safeLimit})`))

    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('id, status, razorpay_order_id, razorpay_payment_id, customer_name, customer_email, customer_phone, shipping_address, created_at')
      .in('status', ['PAID', 'COD_CONFIRMED', 'FULFILLMENT_PENDING', 'SHIPPED', 'DELIVERED'])
      .or('customer_name.is.null,customer_email.is.null,customer_phone.is.null,shipping_address.is.null')
      .or('razorpay_order_id.not.is.null,razorpay_payment_id.not.is.null')
      .order('created_at', { ascending: false })
      .limit(safeLimit)

    if (error) {
      logs.push(createAdminRazorpayLog('error', `Failed to load orders for bulk sync: ${error.message}`))
      return {
        success: false,
        logs,
        processed: 0,
        succeeded: 0,
        failed: 0,
        failedOrderIds: [],
      }
    }

    if (!orders || orders.length === 0) {
      logs.push(createAdminRazorpayLog('info', 'No eligible orders found for bulk sync'))
      return {
        success: true,
        logs,
        processed: 0,
        succeeded: 0,
        failed: 0,
        failedOrderIds: [],
      }
    }

    let succeeded = 0
    let failed = 0
    const failedOrderIds: string[] = []

    for (const order of orders) {
      const result = await syncRazorpayCustomerDetails(order.id)
      if (result.success) {
        succeeded += 1
        logs.push(createAdminRazorpayLog('info', `Synced order ${order.id}`))
      } else {
        failed += 1
        failedOrderIds.push(order.id)
        logs.push(createAdminRazorpayLog('warn', `Failed order ${order.id}: ${result.error || 'unknown error'}`))
      }
    }

    logs.push(createAdminRazorpayLog('info', `Bulk sync complete: ${succeeded}/${orders.length} succeeded`))

    return {
      success: true,
      logs,
      processed: orders.length,
      succeeded,
      failed,
      failedOrderIds,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logs.push(createAdminRazorpayLog('error', `Bulk sync failed: ${errorMessage}`))
    return {
      success: false,
      logs,
      processed: 0,
      succeeded: 0,
      failed: 0,
      failedOrderIds: [],
    }
  }
}
