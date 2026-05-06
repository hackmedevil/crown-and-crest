'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type TimelineEvent = {
  id?: string
  event_type?: string
  created_at?: string
  previous_status?: string
  next_status?: string
  actor_uid?: string
  metadata?: Record<string, unknown>
}

type InternalNote = {
  id?: string
  text?: string
  author_uid?: string
  created_at?: string
}

type Props = {
  orderId: string
  currentStatus: string
  paymentStatus?: string | null
  internalNotes: InternalNote[]
  timeline: TimelineEvent[]
}

const ACTIONS: Array<{ action: string; label: string; requiresShipment?: boolean }> = [
  { action: 'MARK_PAID', label: 'Mark Paid' },
  { action: 'SEND_TO_PROVIDER', label: 'Send to Qikink' },
  { action: 'MARK_IN_PRODUCTION', label: 'Mark In Production' },
  { action: 'MARK_SHIPPED', label: 'Mark Shipped', requiresShipment: true },
  { action: 'MARK_OUT_FOR_DELIVERY', label: 'Mark Out for Delivery' },
  { action: 'MARK_DELIVERED', label: 'Mark Delivered' },
  { action: 'CANCEL_ORDER', label: 'Cancel Order' },
  { action: 'REFUND_ORDER', label: 'Refund Order' },
]

export default function LifecyclePanel({
  orderId,
  currentStatus,
  paymentStatus,
  internalNotes,
  timeline,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [courierName, setCourierName] = useState('')
  const [trackingId, setTrackingId] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')
  const [isSendingShipmentUpdate, setIsSendingShipmentUpdate] = useState(false)

  const sortedTimeline = useMemo(() => {
    return [...timeline].sort((a, b) => {
      const x = a.created_at ? new Date(a.created_at).getTime() : 0
      const y = b.created_at ? new Date(b.created_at).getTime() : 0
      return y - x
    })
  }, [timeline])

  function runAction(action: string, requiresShipment?: boolean) {
    setError(null)

    // SEND_TO_PROVIDER uses the dedicated Qikink integration endpoint
    if (action === 'SEND_TO_PROVIDER') {
      startTransition(async () => {
        const response = await fetch(`/api/admin/orders/${orderId}/send-to-provider`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: 'qikink' }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          setError(result.error || 'Failed to send order to Qikink')
          return
        }
        router.refresh()
      })
      return
    }

    startTransition(async () => {
      const payload: Record<string, unknown> = { action }

      if (requiresShipment) {
        payload.courier = courierName.trim()
        payload.tracking_id = trackingId.trim()
        payload.estimated_delivery = estimatedDelivery || null
      }

      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || 'Failed to update order status')
        return
      }

      router.refresh()
    })
  }

  async function sendShipmentUpdateNow() {
    setError(null)
    setIsSendingShipmentUpdate(true)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/notify-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(result.error || 'Failed to send shipment update')
        return
      }

      toast.success('Shipment update sent to customer')
      router.refresh()
    } finally {
      setIsSendingShipmentUpdate(false)
    }
  }

  function addNote() {
    const text = noteText.trim()
    if (!text) {
      setError('Enter a note before submitting')
      return
    }

    setError(null)

    startTransition(async () => {
      const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || 'Failed to add note')
        return
      }

      setNoteText('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-bold text-gray-900">Lifecycle Controls</h3>
        <p className="text-xs text-gray-500 mt-1">
          Status: <span className="font-semibold text-gray-700">{currentStatus}</span>
          {' · '}
          Payment: <span className="font-semibold text-gray-700">{paymentStatus || 'N/A'}</span>
        </p>

        <div className="grid grid-cols-1 gap-3 mt-4">
          <input
            type="text"
            placeholder="Courier name (required for Mark Shipped)"
            value={courierName}
            onChange={(e) => setCourierName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Tracking ID / AWB (required for Mark Shipped)"
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={estimatedDelivery}
            onChange={(e) => setEstimatedDelivery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {ACTIONS.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={isPending}
              onClick={() => runAction(item.action, item.requiresShipment)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={isPending || isSendingShipmentUpdate}
          onClick={sendShipmentUpdateNow}
          className="mt-3 w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSendingShipmentUpdate ? 'Sending shipment update...' : 'Send Shipment Update to Customer'}
        </button>

        <p className="text-xs text-gray-500 mt-2">
          Shipment update is also sent automatically when you mark an order as shipped with tracking details.
        </p>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-bold text-gray-900">Internal Notes</h3>
        <div className="mt-4 space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
            placeholder="Add an internal note for this order"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={addNote}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            Add Note
          </button>
        </div>

        <div className="mt-4 space-y-3 max-h-72 overflow-auto">
          {internalNotes.length === 0 && (
            <p className="text-xs text-gray-500">No internal notes yet.</p>
          )}
          {internalNotes.map((note) => (
            <div key={note.id || `${note.created_at}-${note.text}`} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.text}</p>
              <p className="text-xs text-gray-500 mt-2">
                {note.author_uid || 'Unknown'} · {note.created_at ? new Date(note.created_at).toLocaleString() : 'Unknown date'}
              </p>
            </div>
          ))}
              <p className="text-xs text-gray-500 mt-2">
                Active provider baseline: <span className="font-semibold text-gray-700">Qikink</span>
              </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-bold text-gray-900 mb-4">Order Timeline</h3>
        <div className="space-y-3 max-h-80 overflow-auto">
          {sortedTimeline.length === 0 && (
            <p className="text-xs text-gray-500">No timeline events yet.</p>
          )}
          {sortedTimeline.map((event) => (
            <div key={event.id || `${event.created_at}-${event.event_type}`} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-900">{event.event_type || 'EVENT'}</p>
              <p className="text-xs text-gray-600 mt-1">
                {event.previous_status || '-'} → {event.next_status || '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {event.actor_uid || 'Unknown'} · {event.created_at ? new Date(event.created_at).toLocaleString() : 'Unknown date'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
