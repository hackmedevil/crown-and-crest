// Shiprocket API TypeScript Interfaces

export interface ShiprocketAuthResponse {
  token: string
  email: string
  id: number
  first_name: string
  last_name: string
}

export interface ShiprocketPincodeServiceability {
  delivery_postcode: string
  serviceable: boolean
  cod_available: boolean
  pickup_postcode?: string
  prepaid_available?: boolean
  estimated_delivery_days?: number
}

export interface ShiprocketCourierRecommendation {
  courier_company_id: number
  courier_name: string
  rate: number
  estimated_delivery_days: number
  cod_charges: number
  cod_multiplier: number
  freight_charge: number
  is_custom_rate: boolean
  min_weight: number
  rating: number
  recommendation_id: string
  suppression_dates: string | null
}

export interface ShiprocketShipmentCreatePayload {
  order_id: string
  order_date: string
  pickup_location?: string
  channel_id?: string
  comment?: string
  billing_customer_name: string
  billing_last_name?: string
  billing_address: string
  billing_address_2?: string
  billing_city: string
  billing_pincode: string
  billing_state: string
  billing_country: string
  billing_email: string
  billing_phone: string
  shipping_is_billing: boolean
  shipping_customer_name?: string
  shipping_last_name?: string
  shipping_address?: string
  shipping_address_2?: string
  shipping_city?: string
  shipping_pincode?: string
  shipping_state?: string
  shipping_country?: string
  shipping_email?: string
  shipping_phone?: string
  order_items: Array<{
    name: string
    sku: string
    units: number
    selling_price: number
    discount?: number
    tax?: number
    hsn?: number
  }>
  payment_method: 'COD' | 'Prepaid'
  sub_total: number
  length: number
  breadth: number
  height: number
  weight: number
}

export interface ShiprocketShipmentCreateResponse {
  order_id: number
  shipment_id: number
  status: string
  status_code: number
  onboarding_completed_now: number
  awb_code: string | null
  courier_company_id: number | null
  courier_name: string | null
}

export interface ShiprocketTrackingData {
  tracking_data: {
    shipment_status: number
    shipment_track: Array<{
      id: number
      awb_code: string
      courier_company_id: number
      shipment_id: number
      order_id: number
      pickup_date: string | null
      delivered_date: string | null
      weight: string
      packages: number
      current_status: string
      delivered_to: string | null
      destination: string
      consignee_name: string
      origin: string
      courier_agent_details: string | null
      edd: string | null
      pod: string | null
      pod_status: string | null
    }>
    shipment_track_activities: Array<{
      date: string
      status: string
      activity: string
      location: string
      sr_status: string
      sr_status_label: string
    }>
  }
}

export type ShipmentStatus = 
  | 'PENDING' 
  | 'CREATED' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT' 
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED' 
  | 'RTO_INITIATED' 
  | 'RTO_DELIVERED' 
  | 'CANCELLED'
  | 'LOST'

export interface ShiprocketWebhookEvent {
  event: string
  data: {
    order_id: string
    awb: string
    courier_name: string
    shipment_status: string
    current_status: string
    status_code: number
    activities: Array<{
      date: string
      status: string
      activity: string
      location: string
    }>
  }
}

// Cached token structure
export interface CachedToken {
  token: string
  expiresAt: number // Unix timestamp in milliseconds
}
