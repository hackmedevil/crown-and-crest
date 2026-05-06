// Qikink Provider Types
// Complete type definitions for the Qikink fulfillment API

export interface QikinkTokenResponse {
  ClientId: string
  Accesstoken: string
  expires_in: number
}

export interface QikinkLineItem {
  search_from_my_products: 1
  quantity: number
  sku: string
}

export interface QikinkShippingAddress {
  first_name: string
  last_name?: string
  address1: string
  address2?: string
  phone: string
  email: string
  city: string
  zip: string
  province: string
  country_code: string
}

export interface QikinkCreateOrderRequest {
  order_number: string
  qikink_shipping: '1'
  gateway: 'PREPAID' | 'COD'
  total_order_value: string
  line_items: QikinkLineItem[]
  shipping_address: QikinkShippingAddress
}

export interface QikinkCreateOrderResponse {
  message: string
  order_id: number
  status_code: string
}

export interface QikinkOrderShipping {
  awb?: string
  tracking_link?: string
  courier?: string
}

export interface QikinkOrder {
  order_id: number
  number: string // matches our order_number e.g. "CC-XXXXXXXXXX"
  status: string // "Shipped", "In Production", "Out for Delivery", "Delivered", "Cancelled"
  shipping?: QikinkOrderShipping
}

// Maps Qikink status strings to our internal OrderStatus values
export const QIKINK_STATUS_MAP: Record<string, string> = {
  'Shipped': 'SHIPPED',
  'Out for Delivery': 'OUT_FOR_DELIVERY',
  'Delivered': 'DELIVERED',
  'In Production': 'IN_PRODUCTION',
  'Processing': 'IN_PRODUCTION',
  'Cancelled': 'CANCELLED',
}

export interface QikinkSyncResult {
  qikink_order_id: number
  order_number: string
  matched_order_id: string | null
  previous_status: string | null
  new_status: string | null
  status_updated: boolean
  tracking_updated: boolean
  notification_sent: boolean
  error?: string
}
