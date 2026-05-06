import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

// ============================================
// MODAL (CANONICAL)
// ============================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlay?: boolean
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnOverlay = true,
}: ModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
      />

      {/* Modal - Bottom Sheet on Mobile, Centered on Desktop */}
      <div
        className={`
          relative bg-white
          w-full ${sizeClasses[size]}
          max-h-[90vh] overflow-y-auto
          
          rounded-t-2xl md:rounded-xl
          shadow-xl
          
          animate-in fade-in slide-in-from-bottom-8 md:slide-in-from-bottom-4
          duration-200
        `.trim().replace(/\s+/g, ' ')}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

// ============================================
// MODAL COMPONENTS
// ============================================

interface ModalHeaderProps {
  title: string
  onClose?: () => void
  description?: string
}

export function ModalHeader({ title, onClose, description }: ModalHeaderProps) {
  return (
    <div className="flex items-start justify-between p-6 border-b border-neutral-200">
      <div className="flex-1">
        <h2 className="text-2xl font-semibold text-brand-black">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

export function ModalBody({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`p-6 ${className}`}>{children}</div>
}

export function ModalFooter({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-center justify-end gap-3 p-6 border-t border-neutral-200 ${className}`}
    >
      {children}
    </div>
  )
}
