'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type Order } from '@/types/order'
import { getReturnReasonOptions, formatCurrency, formatDate, RETURN_POLICY } from '@/lib/returns/constants'
import { createReturn, checkOrderEligibleForReturn, getReturnablItems } from '@/lib/returns/actions'

interface ReturnWizardClientProps {
  orders: Order[]
  userId: string
}

export default function ReturnWizardClient({ orders, userId }: ReturnWizardClientProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [returnableItems, setReturnableItems] = useState<any[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [reasonComments, setReasonComments] = useState('')
  const [resolution, setResolution] = useState('REFUND')
  const [refundMethod, setRefundMethod] = useState('ORIGINAL_PAYMENT')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const reasonOptions = getReturnReasonOptions()
  const eligibleOrders = orders.filter((order) => order.status === 'DELIVERED')

  // Step 1: Select Order
  async function handleSelectOrder(orderId: string) {
    setSelectedOrderId(orderId)
    setError('')
    try {
      const eligibility = await checkOrderEligibleForReturn(orderId)
      if (!eligibility.eligible) {
        setError(eligibility.reason || 'Order not eligible for return')
        return
      }

      const items = await getReturnablItems(orderId)
      setReturnableItems(items)

      // Initialize quantities
      const quantities: Record<string, number> = {}
      items.forEach((item) => {
        quantities[item.id] = 1
      })
      setItemQuantities(quantities)
      setSelectedItems(new Set())
      setStep(2)
    } catch (err) {
      setError('Failed to load items. Please try again.')
      console.error(err)
    }
  }

  function handleSelectItem(itemId: string) {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  function handleQuantityChange(itemId: string, quantity: number) {
    setItemQuantities({
      ...itemQuantities,
      [itemId]: quantity,
    })
  }

  function handleNextStep() {
    if (step === 2 && selectedItems.size === 0) {
      setError('Please select at least one item')
      return
    }
    if (step === 3 && !reason) {
      setError('Please select a reason')
      return
    }
    setError('')
    setStep(step + 1)
  }

  async function handleSubmitReturn() {
    if (!selectedOrderId) {
      setError('Please select an order')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const itemsToReturn = returnableItems
        .filter((item) => selectedItems.has(item.id))
        .map((item) => ({
          order_item_id: item.id,
          quantity: itemQuantities[item.id] || 1,
          reason,
        }))

      await createReturn(selectedOrderId, userId, {
        items: itemsToReturn,
        reason_code: reason,
        reason_comments: reasonComments,
        resolution,
        refund_method: refundMethod,
      })

      router.push('/account/returns')
    } catch (err) {
      setError('Failed to submit return. Please try again.')
      console.error(err)
      setIsLoading(false)
    }
  }

  const daysRemaining = Math.ceil(RETURN_POLICY.window_days - 3)

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="border border-gray-200 bg-white px-10 py-10">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Returns</p>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-gray-900">Start a Return</h1>
            <p className="mt-2 text-sm text-gray-500">Complete the steps below to request a return.</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <div
                  className={`h-10 w-10 flex items-center justify-center border-2 text-xs font-bold uppercase tracking-tight ${
                    s <= step ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {s}
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {['Order', 'Items', 'Reason', 'Resolution', 'Confirm'][s - 1]}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 border-t border-gray-200"></div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="border-l-4 border-red-600 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Select Order */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="border border-gray-200 bg-white px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900">Select an Order</h2>
            <p className="mt-1 text-sm text-gray-600">Choose a delivered order to return.</p>
          </div>

          <div className="space-y-3">
            {eligibleOrders.length > 0 ? (
              eligibleOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleSelectOrder(order.id)}
                  className={`w-full border-2 p-6 text-left transition ${
                    selectedOrderId === order.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Order {order.id.slice(0, 8)}</p>
                      <div className="mt-2 flex gap-4 text-xs text-gray-600">
                        <span>{formatDate(order.created_at)}</span>
                        <span>•</span>
                        <span>{formatCurrency(order.amount, order.currency)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Window</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">7 days</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="border border-gray-200 bg-white p-10 text-center">
                <p className="text-sm text-gray-500">No eligible orders found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Select Items */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="border border-gray-200 bg-white px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900">Select Items to Return</h2>
            <p className="mt-1 text-sm text-gray-600">Choose items and quantities.</p>
          </div>

          <div className="space-y-3">
            {returnableItems.map((item) => (
              <label key={item.id} className="flex cursor-pointer gap-4 border border-gray-200 bg-white p-6 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedItems.has(item.id)}
                  onChange={() => handleSelectItem(item.id)}
                  className="mt-1 h-5 w-5 border-gray-300 text-black"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.product_name}</p>
                  {item.variant_label && <p className="text-xs text-gray-600">{item.variant_label}</p>}
                  <p className="text-sm text-gray-700">Price: {formatCurrency(item.unit_price, 'INR')}</p>
                </div>
                {selectedItems.has(item.id) && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Qty</label>
                    <input
                      type="number"
                      min="1"
                      max={item.quantity}
                      value={itemQuantities[item.id] || 1}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                      className="h-8 w-12 border border-gray-300 px-2 text-center text-sm outline-none focus:border-black"
                    />
                  </div>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Select Reason */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="border border-gray-200 bg-white px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900">Why are you returning?</h2>
            <p className="mt-1 text-sm text-gray-600">Tell us the reason for your return.</p>
          </div>

          <div className="border border-gray-200 bg-white p-6">
            <label className="block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Reason</p>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-3 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              >
                <option value="">Select a reason...</option>
                {reasonOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-6 block">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Additional Comments (Optional)</p>
              <textarea
                value={reasonComments}
                onChange={(e) => setReasonComments(e.target.value)}
                placeholder="Tell us more about your return..."
                maxLength={500}
                className="mt-3 min-h-24 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
              <p className="mt-1 text-xs text-gray-500">{reasonComments.length}/500</p>
            </label>
          </div>
        </div>
      )}

      {/* Step 4: Choose Resolution */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="border border-gray-200 bg-white px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900">Choose Your Resolution</h2>
            <p className="mt-1 text-sm text-gray-600">How would you like to resolve this return?</p>
          </div>

          <div className="space-y-3">
            {[
              { value: 'REFUND', label: 'Refund', desc: 'Credit back to original payment' },
              { value: 'EXCHANGE', label: 'Exchange', desc: 'Swap for a different size' },
              { value: 'STORE_CREDIT', label: 'Store Credit', desc: 'Get credit for future purchases' },
            ].map((opt) => (
              <label key={opt.value} className="flex cursor-pointer gap-4 border-2 p-6 hover:border-gray-400" style={{ borderColor: resolution === opt.value ? '#000' : '#e5e7eb', backgroundColor: resolution === opt.value ? '#fafafa' : '#fff' }}>
                <input
                  type="radio"
                  name="resolution"
                  value={opt.value}
                  checked={resolution === opt.value}
                  onChange={(e) => setResolution(e.target.value)}
                  className="mt-1 h-5 w-5"
                />
                <div>
                  <p className="font-semibold text-gray-900">{opt.label}</p>
                  <p className="text-sm text-gray-600">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {resolution === 'REFUND' && (
            <div className="border border-gray-200 bg-white p-6">
              <label className="block">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refund Method</p>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="mt-3 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
                >
                  <option value="ORIGINAL_PAYMENT">Original Payment Method</option>
                  <option value="WALLET">Wallet</option>
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Confirmation */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="border border-gray-200 bg-white px-8 py-6">
            <h2 className="text-xl font-semibold text-gray-900">Review Your Return</h2>
            <p className="mt-1 text-sm text-gray-600">Please review the details before submitting.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="border border-gray-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Order</p>
              <p className="mt-2 font-semibold text-gray-900">{selectedOrderId?.slice(0, 8)}</p>
            </div>
            <div className="border border-gray-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Items</p>
              <p className="mt-2 font-semibold text-gray-900">{selectedItems.size} item(s)</p>
            </div>
            <div className="border border-gray-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Reason</p>
              <p className="mt-2 font-semibold text-gray-900">{reasonOptions.find((o) => o.value === reason)?.label}</p>
            </div>
            <div className="border border-gray-200 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Resolution</p>
              <p className="mt-2 font-semibold text-gray-900">
                {resolution === 'REFUND' ? 'Refund' : resolution === 'EXCHANGE' ? 'Exchange' : 'Store Credit'}
              </p>
            </div>
          </div>

          <div className="border border-orange-200 bg-orange-50 p-6">
            <p className="text-sm text-orange-900">
              <strong>Next Steps:</strong> Once submitted, our team will review your return within 24 hours. If approved, a courier will contact you to schedule pickup.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 border-t border-gray-200 pt-10">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 border border-gray-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 hover:border-black hover:text-black"
            disabled={isLoading}
          >
            ← Previous
          </button>
        )}
        {step < 5 ? (
          <button
            onClick={handleNextStep}
            className="flex-1 border border-black bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-gray-900 disabled:opacity-50"
            disabled={isLoading}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmitReturn}
            className="flex-1 border border-black bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-gray-900 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Submitting...' : 'Submit Return'}
          </button>
        )}
      </div>
    </div>
  )
}
