import Link from 'next/link'
import { type Return } from '@/types/return'
import {
  getReturnStatusLabel,
  getReturnStatusColor,
  getReturnReasonLabel,
  formatCurrency,
} from '@/lib/returns/constants'

interface ReturnCardProps {
  return: Return
  isActive?: boolean
}

export default function ReturnCard({ return: returnItem, isActive }: ReturnCardProps) {
  const statusColor = getReturnStatusColor(returnItem.status)
  const statusLabel = getReturnStatusLabel(returnItem.status)
  const reasonLabel = getReturnReasonLabel(returnItem.reason_code)
  const createdDate = new Date(returnItem.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="border border-gray-200 bg-white p-8 transition duration-200 hover:shadow-sm">
      {/* Header Row */}
      <div className="flex flex-col gap-6 border-b border-gray-200 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="text-base font-semibold text-gray-900">{returnItem.id}</span>
            <span>Order: {returnItem.order_id.slice(0, 8)}</span>
            <span>{createdDate}</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Reason</p>
            <p className="mt-1 text-sm text-gray-700">{reasonLabel}</p>
          </div>
          {returnItem.reason_comments && (
            <p className="text-sm italic text-gray-600">"{returnItem.reason_comments}"</p>
          )}
        </div>

        <div className="space-y-3 text-right">
          <span
            className={`inline-flex items-center border px-3 py-1 text-xs font-semibold uppercase ${statusColor}`}
          >
            {statusLabel}
          </span>
          {returnItem.refund_amount && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refund Amount</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {formatCurrency(returnItem.refund_amount)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Details Row */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3 text-sm text-gray-600">
          {returnItem.pickup_scheduled_date && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Pickup Scheduled</p>
              <p className="mt-1">
                {new Date(returnItem.pickup_scheduled_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {returnItem.courier_name && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Courier</p>
              <p className="mt-1">{returnItem.courier_name}</p>
            </div>
          )}

          {returnItem.estimated_refund_date && !returnItem.actual_refund_date && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Est. Refund Date</p>
              <p className="mt-1">
                {new Date(returnItem.estimated_refund_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {returnItem.actual_refund_date && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refunded On</p>
              <p className="mt-1">
                {new Date(returnItem.actual_refund_date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {returnItem.refund_method && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refund Method</p>
              <p className="mt-1">
                {returnItem.refund_method === 'ORIGINAL_PAYMENT' ? 'Original Payment' : 'Wallet'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {returnItem.tracking_link && (
            <a
              href={returnItem.tracking_link}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-gray-900"
            >
              Track Pickup
            </a>
          )}
          <Link
            href={`/account/returns/${returnItem.id}`}
            className="border border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 hover:border-black hover:text-black"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  )
}
