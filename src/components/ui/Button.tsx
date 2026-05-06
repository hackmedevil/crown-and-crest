import { ButtonHTMLAttributes, forwardRef } from 'react'
import { tokens } from '@/lib/design/tokens'

// ============================================
// BUTTON VARIANTS (CANONICAL)
// ============================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // MOBILE-FIRST: Full-width on mobile, inline on desktop
    const baseStyles = `
      w-full md:w-auto
      inline-flex items-center justify-center
      font-medium transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `

    const variantStyles = {
      primary: `
        bg-brand-black text-white
        hover:bg-brand-darkGray
        focus:ring-brand-black
      `,
      secondary: `
        bg-white text-brand-black border border-neutral-200
        hover:bg-neutral-50 hover:border-neutral-300
        focus:ring-neutral-300
      `,
      ghost: `
        bg-transparent text-brand-black
        hover:bg-neutral-100
        focus:ring-neutral-300
      `,
      danger: `
        bg-status-error text-white
        hover:bg-red-700
        focus:ring-status-error
      `,
    }

    // MOBILE-FIRST: 40px/44px/56px tap targets
    const sizeStyles = {
      sm: 'h-10 px-4 text-sm rounded-md',   /* 40px mobile tap target */
      md: 'h-11 px-6 text-base rounded-lg', /* 44px mobile tap target */
      lg: 'h-14 px-8 text-lg rounded-lg',   /* 56px large tap target */
    }

    // fullWidth prop overrides the mobile-first behavior
    const widthStyle = fullWidth ? 'w-full md:w-full' : ''

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthStyle}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
