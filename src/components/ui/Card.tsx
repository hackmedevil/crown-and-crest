import { HTMLAttributes, ReactNode } from 'react'

// ============================================
// CARD VARIANTS (CANONICAL)
// ============================================

type CardVariant = 'default' | 'product' | 'admin' | 'interactive'
type CardPadding = 'sm' | 'md' | 'lg' | 'none'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  hover?: boolean
}

export function Card({
  variant = 'default',
  padding = 'md',
  hover = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const baseStyles = `
    bg-white rounded-xl border border-neutral-200
    transition-all duration-200
  `

  const variantStyles = {
    default: '',
    product: 'group cursor-pointer',
    admin: 'shadow-sm',
    interactive: 'cursor-pointer hover:border-neutral-300',
  }

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const hoverStyles = hover
    ? 'hover:shadow-md hover:border-neutral-300 hover:-translate-y-0.5'
    : ''

  return (
    <div
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${hoverStyles}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  )
}

// ============================================
// CARD COMPONENTS
// ============================================

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: ReactNode
}

export function CardHeader({
  title,
  description,
  action,
  children,
  className = '',
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between gap-4 mb-6 ${className}`}
      {...props}
    >
      <div className="flex-1">
        {title && <h3 className="text-xl font-semibold text-brand-black">{title}</h3>}
        {description && (
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        )}
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardContent({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center gap-3 mt-6 pt-6 border-t border-neutral-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
