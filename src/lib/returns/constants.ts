import type { ReturnStatus, ReturnReason, ReturnResolution, RefundMethod } from '@/types/return'

export const RETURN_POLICY = {
  window_days: 7,
  conditions: [
    'Items must be in original condition with tags attached',
    'No signs of wear, damage, or washing',
    'Original packaging should be intact',
    'Applicable only on delivered items',
  ],
  non_returnable_items: ['Innerwear', 'Swimwear', 'Final Sale items'],
  refund_processing_days: 5,
}

export function getReturnStatusLabel(status: ReturnStatus): string {
  const labels: Record<ReturnStatus, string> = {
    REQUESTED: 'Return Requested',
    APPROVED: 'Approved',
    PICKUP_SCHEDULED: 'Pickup Scheduled',
    IN_TRANSIT: 'In Transit',
    INSPECTION_PENDING: 'Inspection Pending',
    REFUNDED: 'Refunded',
    REJECTED: 'Rejected',
  }
  return labels[status]
}

export function getReturnStatusColor(status: ReturnStatus): string {
  switch (status) {
    case 'REFUNDED':
      return 'border-green-600 text-green-700'
    case 'REJECTED':
      return 'border-red-600 text-red-700'
    case 'IN_TRANSIT':
    case 'PICKUP_SCHEDULED':
      return 'border-orange-500 text-orange-600'
    case 'APPROVED':
      return 'border-blue-500 text-blue-600'
    case 'REQUESTED':
    case 'INSPECTION_PENDING':
      return 'border-gray-400 text-gray-700'
    default:
      return 'border-gray-400 text-gray-700'
  }
}

export function getReturnReasonLabel(reason: ReturnReason): string {
  const labels: Record<ReturnReason, string> = {
    WRONG_SIZE: 'Wrong Size',
    DAMAGED_PRODUCT: 'Damaged Product',
    NOT_AS_EXPECTED: 'Not as Expected',
    QUALITY_ISSUE: 'Quality Issue',
    RECEIVED_WRONG_ITEM: 'Received Wrong Item',
    OTHER: 'Other',
  }
  return labels[reason]
}

export function getReturnReasonOptions(): Array<{ value: ReturnReason; label: string }> {
  return [
    { value: 'WRONG_SIZE', label: 'Wrong Size' },
    { value: 'DAMAGED_PRODUCT', label: 'Damaged Product' },
    { value: 'NOT_AS_EXPECTED', label: 'Not as Expected' },
    { value: 'QUALITY_ISSUE', label: 'Quality Issue' },
    { value: 'RECEIVED_WRONG_ITEM', label: 'Received Wrong Item' },
    { value: 'OTHER', label: 'Other' },
  ]
}

export function getReturnResolutionLabel(resolution: ReturnResolution): string {
  const labels: Record<ReturnResolution, string> = {
    REFUND: 'Refund to Original Payment',
    EXCHANGE: 'Exchange for Different Size',
    STORE_CREDIT: 'Store Credit',
  }
  return labels[resolution]
}

export function getRefundMethodLabel(method: RefundMethod): string {
  return method === 'ORIGINAL_PAYMENT' ? 'Original Payment' : 'Wallet'
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const RETURN_STATUS_FLOW = {
  REQUESTED: {
    description: 'Waiting for approval',
    nextSteps: 'Our team will review your return request within 24 hours.',
  },
  APPROVED: {
    description: 'Approved - ready for pickup',
    nextSteps: 'A courier will contact you to schedule pickup.',
  },
  PICKUP_SCHEDULED: {
    description: 'Pickup scheduled',
    nextSteps: 'Your item will be picked up on the scheduled date.',
  },
  IN_TRANSIT: {
    description: 'Item in transit',
    nextSteps: 'Your item is on its way to our warehouse.',
  },
  INSPECTION_PENDING: {
    description: 'Under inspection',
    nextSteps: 'We are verifying the condition of your item.',
  },
  REFUNDED: {
    description: 'Refund processed',
    nextSteps: 'Refund has been credited to your account.',
  },
  REJECTED: {
    description: 'Return rejected',
    nextSteps: 'Item did not meet return conditions. Contact support for details.',
  },
}
