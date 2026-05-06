// Shiprocket Shipment Creation & Tracking

import { shiprocketRequest } from './client'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  ShiprocketShipmentCreatePayload,
  ShiprocketShipmentCreateResponse,
  ShiprocketTrackingData,
  ShipmentStatus,
} from './types'

/**
 * Create shipment in Shiprocket for an order
 * Fetches order details from database and creates shipment
 * Updates order with tracking info
 * 
 * @param orderId - Internal order UUID
 * @returns Shipment ID and AWB code
 */
export async function createShipment(orderId: string): Promise<{
  shipmentId: number
  awbCode: string | null
  courierName: string | null
}> {
  console.log('[SHIPROCKET_SHIPMENT] Creating shipment for order:', orderId)

  // 1. Fetch order details from database
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        variants:variant_id (
          id,
          sku,
          size,
          color,
          products:product_id (
            id,
            name,
            shipping_weight,
            shipping_dimensions
          )
        )
      )
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`)
  }

  // 2. Validate order has shipping address
  if (!order.shipping_address) {
    throw new Error('Order missing shipping address')
  }

  const address = typeof order.shipping_address === 'string' 
    ? JSON.parse(order.shipping_address) 
    : order.shipping_address

  // 3. Calculate total weight and dimensions
  const totalWeight = calculateTotalWeight(order.order_items)
  const dimensions = getDefaultDimensions() // Default box dimensions

  // 4. Build Shiprocket order payload
  const payload: ShiprocketShipmentCreatePayload = {
    order_id: order.id.slice(0, 40), // Shiprocket order ID (unique)
    order_date: new Date(order.created_at).toISOString().split('T')[0],
    billing_customer_name: address.fullName || 'Customer',
    billing_address: address.addressLine1,
    billing_address_2: address.addressLine2 || '',
    billing_city: address.city,
    billing_pincode: address.pincode,
    billing_state: address.state,
    billing_country: 'India',
    billing_email: order.customer_email || 'customer@example.com',
    billing_phone: order.customer_phone || '9999999999',
    shipping_is_billing: true,
    order_items: order.order_items.map((item: any) => {
      const variant = item.variants
      const product = variant?.products
      return {
        name: product?.name || 'Product',
        sku: variant?.sku || item.variant_id,
        units: item.quantity,
        selling_price: item.price_at_purchase,
        discount: 0,
        tax: 0,
      }
    }),
    payment_method: order.is_cod ? 'COD' : 'Prepaid',
    sub_total: order.amount,
    length: dimensions.length,
    breadth: dimensions.breadth,
    height: dimensions.height,
    weight: totalWeight,
  }

  try {
    // 5. Create shipment in Shiprocket
    const response = await shiprocketRequest<ShiprocketShipmentCreateResponse>(
      '/orders/create/adhoc',
      {
        method: 'POST',
        body: payload,
      }
    )

    console.log('[SHIPROCKET_SHIPMENT] Shipment created:', response.shipment_id)

    // 6. Update order in database with shipment details
    await supabaseAdmin
      .from('orders')
      .update({
        shiprocket_shipment_id: String(response.shipment_id),
        shiprocket_order_id: String(response.order_id),
        tracking_id: response.awb_code,
        courier_name: response.courier_name,
        shipment_status: 'CREATED',
        last_tracking_update: new Date().toISOString(),
      })
      .eq('id', orderId)

    return {
      shipmentId: response.shipment_id,
      awbCode: response.awb_code,
      courierName: response.courier_name,
    }

  } catch (error) {
    console.error('[SHIPROCKET_SHIPMENT] Error creating shipment:', error)
    throw error
  }
}

/**
 * Get tracking details for an AWB
 */
export async function getTrackingDetails(awb: string): Promise<ShiprocketTrackingData | null> {
  try {
    const response = await shiprocketRequest<ShiprocketTrackingData>(
      '/courier/track/awb',
      {
        method: 'GET',
        params: { awb },
      }
    )

    return response

  } catch (error) {
    console.error('[SHIPROCKET_SHIPMENT] Error fetching tracking:', error)
    return null
  }
}

/**
 * Map Shiprocket status to our internal shipment status
 */
export function mapShiprocketStatus(shiprocketStatus: string): ShipmentStatus {
  const statusMap: Record<string, ShipmentStatus> = {
    'NEW': 'CREATED',
    'PICKUP_SCHEDULED': 'CREATED',
    'PICKUP_PENDING': 'CREATED',
    'PICKED_UP': 'PICKED_UP',
    'IN_TRANSIT': 'IN_TRANSIT',
    'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
    'DELIVERED': 'DELIVERED',
    'RTO_INITIATED': 'RTO_INITIATED',
    'RTO_DELIVERED': 'RTO_DELIVERED',
    'CANCELLED': 'CANCELLED',
    'LOST': 'LOST',
  }

  return statusMap[shiprocketStatus] || 'IN_TRANSIT'
}

/**
 * Calculate total weight from order items
 */
function calculateTotalWeight(items: any[]): number {
  const totalWeight = items.reduce((sum, item) => {
    const product = item.variants?.products
    const weight = product?.shipping_weight || 0.5 // Default 500g per item
    return sum + (weight * item.quantity)
  }, 0)

  return Math.max(totalWeight, 0.5) // Minimum 500g
}

/**
 * Get default box dimensions (can be customized per product later)
 */
function getDefaultDimensions() {
  return {
    length: 30, // cm
    breadth: 20, // cm
    height: 10, // cm
  }
}
