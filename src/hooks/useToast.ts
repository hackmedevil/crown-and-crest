'use client'

import toast from 'react-hot-toast'

/**
 * Custom toast hook for consistent notifications across the app
 * Wraps react-hot-toast with pre-configured messages
 */
export function useToast() {
  const showSuccess = (message: string) => {
    return toast.success(message)
  }

  const showError = (message: string) => {
    return toast.error(message)
  }

  const showLoading = (message: string) => {
    return toast.loading(message)
  }

  const dismiss = (toastId?: string) => {
    toast.dismiss(toastId)
  }

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return toast.promise(promise, messages)
  }

  return {
    showSuccess,
    showError,
    showLoading,
    dismiss,
    promise,
  }
}

// Named exports for direct use
export const showSuccessToast = (message: string) => toast.success(message)
export const showErrorToast = (message: string) => toast.error(message)
export const showLoadingToast = (message: string) => toast.loading(message)
export const dismissToast = (toastId?: string) => toast.dismiss(toastId)
