import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react'

// ============================================
// INPUT (CANONICAL)
// ============================================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-brand-black mb-2">
            {label}
            {props.required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full h-11 px-4 text-base
            bg-white border border-neutral-200 rounded-lg
            text-brand-black placeholder:text-neutral-400
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-brand-black focus:border-transparent
            disabled:bg-neutral-50 disabled:cursor-not-allowed
            ${error ? 'border-status-error focus:ring-status-error' : ''}
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-status-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ============================================
// TEXTAREA (CANONICAL)
// ============================================

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', rows = 4, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-brand-black mb-2">
            {label}
            {props.required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`
            w-full px-4 py-3 text-base
            bg-white border border-neutral-200 rounded-lg
            text-brand-black placeholder:text-neutral-400
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-brand-black focus:border-transparent
            disabled:bg-neutral-50 disabled:cursor-not-allowed
            resize-vertical
            ${error ? 'border-status-error focus:ring-status-error' : ''}
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-status-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// ============================================
// SELECT (CANONICAL)
// ============================================

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options: Array<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-brand-black mb-2">
            {label}
            {props.required && <span className="text-status-error ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full h-11 px-4 text-base
            bg-white border border-neutral-200 rounded-lg
            text-brand-black
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-brand-black focus:border-transparent
            disabled:bg-neutral-50 disabled:cursor-not-allowed
            appearance-none cursor-pointer
            ${error ? 'border-status-error focus:ring-status-error' : ''}
            ${className}
          `.trim().replace(/\s+/g, ' ')}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-sm text-status-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
