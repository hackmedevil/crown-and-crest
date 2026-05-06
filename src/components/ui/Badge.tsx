import { HTMLAttributes } from 'react'

// ============================================
// BADGE VARIANTS (CANONICAL)
// ============================================

type BadgeVariant =
  | 'default'
  | 'sizebook'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = `
    inline-flex items-center gap-1
    px-3 py-1 text-sm font-medium rounded-full
    transition-colors duration-200
  `

  const variantStyles = {
    default: 'bg-neutral-100 text-neutral-700',
    sizebook: 'bg-sizebook-bg text-sizebook-primary',
    success: 'bg-status-successBg text-status-success',
    warning: 'bg-status-warningBg text-status-warning',
    error: 'bg-status-errorBg text-status-error',
    info: 'bg-status-infoBg text-status-info',
    neutral: 'bg-neutral-100 text-neutral-600',
  }

  return (
    <span
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </span>
  )
}

// ============================================
// STATUS BADGE (FOR ADMIN)
// ============================================

type StatusValue =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'active'
  | 'inactive'
  | 'draft'
  | 'published'

interface StatusBadgeProps {
  status: StatusValue
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig: Record<
    StatusValue,
    { label: string; variant: BadgeVariant }
  > = {
    PENDING: { label: 'Pending', variant: 'warning' },
    PAYMENT_PENDING: { label: 'Payment Pending', variant: 'warning' },
    PAID: { label: 'Paid', variant: 'success' },
    CONFIRMED: { label: 'Confirmed', variant: 'success' },
    SHIPPED: { label: 'Shipped', variant: 'info' },
    DELIVERED: { label: 'Delivered', variant: 'success' },
    CANCELLED: { label: 'Cancelled', variant: 'error' },
    REFUNDED: { label: 'Refunded', variant: 'neutral' },
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'neutral' },
    draft: { label: 'Draft', variant: 'warning' },
    published: { label: 'Published', variant: 'success' },
  }

  const config = statusConfig[status] || { label: status, variant: 'default' }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}

// ============================================
// STOCK BADGE
// ============================================

interface StockBadgeProps {
  stock: number
  threshold?: number
  className?: string
}

export function StockBadge({
  stock,
  threshold = 10,
  className = '',
}: StockBadgeProps) {
  const getVariant = (): BadgeVariant => {
    if (stock === 0) return 'error'
    if (stock <= threshold) return 'warning'
    return 'success'
  }

  const getLabel = () => {
    if (stock === 0) return 'Out of Stock'
    if (stock <= threshold) return `Low Stock (${stock})`
    return `In Stock (${stock})`
  }

  return (
    <Badge variant={getVariant()} className={className}>
      {getLabel()}
    </Badge>
  )
}
