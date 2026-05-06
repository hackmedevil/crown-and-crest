/**
 * Order Item Feedback Component
 * Phase 16: Captures post-purchase fit feedback from users
 * - Shows optional feedback form after delivery
 * - Links feedback to Sizebook recommendation (if applicable)
 * - Integrates feedback into learning loop
 */

'use client'

import { useState } from 'react'
import { OrderItem, FeedbackType, OrderItemFeedback } from '@/types/order'
import {
  saveFeedback,
  getFeedbackForOrderItem,
  deleteFeedback,
} from '@/lib/orders/feedback'

interface OrderFeedbackProps {
  orderItem: OrderItem & {
    recommended_size?: string | null
    size_profile_id?: string | null
  }
  selected_size: string
}

export default function OrderFeedback({
  orderItem,
  selected_size,
}: OrderFeedbackProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<OrderItemFeedback | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(
    null
  )
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load existing feedback when component mounts or item changes
  const loadFeedback = async () => {
    try {
      const existing = await getFeedbackForOrderItem(orderItem.id)
      setFeedback(existing)
      if (existing) {
        setSelectedFeedback(existing.feedback_type)
        setNotes(existing.notes || '')
      }
    } catch (err) {
      console.error('Failed to load feedback:', err)
    }
  }

  const handleOpen = async () => {
    setIsOpen(true)
    await loadFeedback()
  }

  const handleSave = async () => {
    if (!selectedFeedback) {
      setError('Please select how the item fit')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await saveFeedback(orderItem.id, selectedFeedback, notes)
      setFeedback(result)
      setSuccess(true)
      setTimeout(() => setIsOpen(false), 1500)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save feedback'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!feedback) return

    if (
      !confirm(
        'Delete your feedback? This will help us improve size recommendations.'
      )
    ) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await deleteFeedback(feedback.id)
      setFeedback(null)
      setSelectedFeedback(null)
      setNotes('')
      setSuccess(true)
      setTimeout(() => setIsOpen(false), 1000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete feedback'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-semibold text-sm text-blue-900">
              How did the size fit?
            </h4>
            <p className="text-xs text-blue-700 mt-1">
              Your feedback helps us improve size recommendations
            </p>
          </div>
          <button
            onClick={handleOpen}
            className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
          >
            {feedback ? 'Edit' : 'Tell us'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          How did the size fit?
        </h3>

        {/* Size Context */}
        <div className="mb-6 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
          <p className="text-gray-600">
            <span className="font-medium">Size selected:</span>{' '}
            <span className="text-gray-900 font-semibold">{selected_size}</span>
          </p>
          {orderItem.recommended_size && (
            <p className="text-gray-600 mt-1">
              <span className="font-medium">Sizebook suggested:</span>{' '}
              <span className="text-amber-600 font-semibold">
                {orderItem.recommended_size}
              </span>
            </p>
          )}
        </div>

        {/* Feedback Options */}
        <div className="space-y-2 mb-6">
          {(
            [
              {
                value: 'FITS_WELL' as const,
                label: 'Fits well ✓',
                color: 'green',
              },
              {
                value: 'TOO_SMALL' as const,
                label: 'Too small',
                color: 'orange',
              },
              {
                value: 'TOO_LARGE' as const,
                label: 'Too large',
                color: 'blue',
              },
              {
                value: 'QUALITY_ISSUE' as const,
                label: 'Quality issue',
                color: 'red',
              },
              {
                value: 'OTHER' as const,
                label: 'Other',
                color: 'gray',
              },
            ] as const
          ).map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setSelectedFeedback(value)}
              className={`w-full p-3 text-left rounded border-2 transition-colors text-sm font-medium ${
                selectedFeedback === value
                  ? {
                      green: 'border-green-500 bg-green-50 text-green-900',
                      orange: 'border-amber-500 bg-amber-50 text-amber-900',
                      blue: 'border-blue-500 bg-blue-50 text-blue-900',
                      red: 'border-red-500 bg-red-50 text-red-900',
                      gray: 'border-gray-500 bg-gray-100 text-gray-900',
                    }[color]
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            placeholder="E.g., 'The shoulders were tight', 'Perfect with room to move'"
            maxLength={200}
            className="w-full p-3 border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">
            {notes.length}/200 characters
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
            {feedback ? 'Feedback saved! Thank you.' : 'Feedback deleted.'}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setIsOpen(false)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Cancel
          </button>
          {feedback && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={loading || !selectedFeedback}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Feedback'}
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your feedback is optional and never blocks returns.
          <br />
          It helps us improve size recommendations for everyone.
        </p>
      </div>
    </div>
  )
}
