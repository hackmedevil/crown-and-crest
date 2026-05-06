import { ButtonHTMLAttributes, ReactNode } from 'react'

interface MonochromeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    loading?: boolean
    fullWidth?: boolean
}

/**
 * AIButton - Black solid (Primary action for AI features)
 */
export function AIButton({
    children,
    loading,
    fullWidth,
    className = '',
    disabled,
    ...props
}: MonochromeButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2
        px-6 py-2.5 rounded-lg
        bg-black text-white text-sm font-semibold
        hover:bg-gray-900
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                </>
            ) : children}
        </button>
    )
}

/**
 * OutlinedButton - White with black border (All other actions)
 */
export function OutlinedButton({
    children,
    loading,
    fullWidth,
    className = '',
    disabled,
    ...props
}: MonochromeButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2
        px-6 py-2.5 rounded-lg
        bg-white text-black text-sm font-semibold
        border border-black
        hover:bg-gray-50
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                </>
            ) : children}
        </button>
    )
}

/**
 * DangerButton - White with red border (Delete actions)
 */
export function DangerButton({
    children,
    loading,
    fullWidth,
    className = '',
    disabled,
    ...props
}: MonochromeButtonProps) {
    return (
        <button
            className={`
        inline-flex items-center justify-center gap-2
        px-6 py-2.5 rounded-lg
        bg-white text-red-600 text-sm font-semibold
        border border-red-600
        hover:bg-red-50
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                </>
            ) : children}
        </button>
    )
}

// Export all as MonochromeButtons for easy importing
export const MonochromeButtons = {
    AI: AIButton,
    Outlined: OutlinedButton,
    Danger: DangerButton,
}
