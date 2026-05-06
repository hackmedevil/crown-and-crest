export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PICKUP_SCHEDULED'
  | 'IN_TRANSIT'
  | 'INSPECTION_PENDING'
  | 'REFUNDED'
  | 'REJECTED'

export type ReturnReason =
  | 'WRONG_SIZE'
  | 'DAMAGED_PRODUCT'
  | 'NOT_AS_EXPECTED'
  | 'QUALITY_ISSUE'
  | 'RECEIVED_WRONG_ITEM'
  | 'OTHER'

export type ReturnResolution = 'REFUND' | 'EXCHANGE' | 'STORE_CREDIT'

export type RefundMethod = 'ORIGINAL_PAYMENT' | 'WALLET'

export interface Return {
  id: string
  order_id: string
  firebase_uid: string
  status: ReturnStatus
  resolution: ReturnResolution
  reason_code: ReturnReason
  reason_comments: string | null
  refund_method: RefundMethod
  refund_amount: number | null
  estimated_refund_date: string | null
  actual_refund_date: string | null
  pickup_address?: {
    fullName?: string
    addressLine1?: string
    city?: string
    state?: string
    pincode?: string
  }
  pickup_scheduled_date: string | null
  courier_name: string | null
  tracking_number: string | null
  tracking_link: string | null
  images_url: string[] | null
  created_at: string
  updated_at: string
}

export interface ReturnItem {
  id: string
  return_id: string
  order_item_id: string
  quantity: number
  reason_for_item: ReturnReason
  images_url: string[] | null
  created_at: string
}

export interface ReturnWithItems extends Return {
  items?: ReturnItem[]
}

export interface ReturnWithOrderData extends Return {
  order?: {
    id: string
    amount: number
    currency: string
  }
  items?: (ReturnItem & {
    product_name?: string
    variant_label?: string | null
    unit_price?: number
    quantity?: number
  })[]
}

// Return policy info
export interface ReturnPolicy {
  window_days: number
  conditions: string[]
  non_returnable_items: string[]
  refund_processing_days: number
}
