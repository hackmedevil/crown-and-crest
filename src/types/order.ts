export type OrderStatus =
  | 'CREATED'
  | 'PAID'
  | 'SENT_TO_PROVIDER'
  | 'IN_PRODUCTION'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'SHIPPED'
  | 'REFUNDED'

export interface Order {
  id: string
  order_number?: string
  firebase_uid: string
  amount: number
  currency: 'INR'
  status: OrderStatus
  provider?: 'qikink'
  provider_order_id?: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  shipping_address?: {
    fullName: string
    addressLine1: string
    city: string
    state: string
    pincode: string
  }
  customer_phone?: string
  courier?: string | null
  courier_name?: string | null
  tracking_id?: string | null
  tracking_url?: string | null
  shipment_status?: string | null
  estimated_delivery_date?: string | null
  actual_delivery_date?: string | null
  actual_shipping_fee?: number | null
  last_tracking_update?: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_slug?: string | null
  variant_id: string
  product_name: string
  variant_label: string | null
  unit_price: number
  quantity: number
  subtotal: number
  created_at: string
  image_url?: string | null
}

export type OrderWithItems = {
  order: Order
  items: OrderItem[]
}

// ============================================
// Phase 16: Feedback & Fit Learning Types
// ============================================

export type FeedbackType =
  | 'TOO_SMALL'
  | 'TOO_LARGE'
  | 'FITS_WELL'
  | 'QUALITY_ISSUE'
  | 'OTHER'

export interface OrderItemFeedback {
  id: string
  order_item_id: string
  user_uid: string
  size_profile_id: string | null
  recommended_size: string | null
  selected_size: string
  feedback_type: FeedbackType
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SizebookFitStat {
  id: string
  size_profile_id: string
  category: string
  metric: string
  total_feedback: number
  fits_well_count: number
  too_small_count: number
  too_large_count: number
  quality_issue_count: number
  other_count: number
  adjustment_cm: number
  adjustment_updated_at: string
  previous_adjustment_cm: number | null
  adjustment_reason: string | null
  created_at: string
  updated_at: string
}

export interface FitStatsSummary {
  metric: string
  total_feedback: number
  fits_well_pct: number | null
  too_small_pct: number | null
  too_large_pct: number | null
  adjustment_cm: number
  adjusted_at: string
  sample_adequate: boolean
}

export interface AdjustmentHistoryEntry {
  id: string
  size_profile_id: string
  metric: string
  previous_adjustment_cm: number
  new_adjustment_cm: number
  reason: string
  adjustment_rule: string
  sample_count: number
  fits_well_count: number
  too_small_count: number
  too_large_count: number
  triggered_by: string
  created_at: string
  is_reverted: boolean
  reverted_at: string | null
  revert_reason: string | null
}

export interface FitLearningMetrics {
  size_profile_id: string
  category: string
  stats: FitStatsSummary[]
  recent_adjustments: AdjustmentHistoryEntry[]
  health_status: 'HEALTHY' | 'SKEWED' | 'LOW_SAMPLE'
}

// Recommendation with applied learned adjustments
export interface RecommendationWithAdjustments {
  recommended_size: string
  confidence: number
  base_recommendation: {
    recommended_size: string
    confidence: number
  }
  adjustments_applied: Record<string, number>
  applied_at: string
}
