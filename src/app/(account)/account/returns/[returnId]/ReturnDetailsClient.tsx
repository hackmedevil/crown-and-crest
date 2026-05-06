'use client'

import Link from 'next/link'
import { type ReturnWithOrderData } from '@/types/return'
import {
  getReturnStatusLabel,
  getReturnStatusColor,
  getReturnReasonLabel,
  getReturnResolutionLabel,
  getRefundMethodLabel,
  formatCurrency,
  formatDate,
  RETURN_STATUS_FLOW,
} from '@/lib/returns/constants'

interface ReturnDetailsClientProps {
  return: ReturnWithOrderData
}

export default function ReturnDetailsClient({ return: returnData }: ReturnDetailsClientProps) {
  const statusColor = getReturnStatusColor(returnData.status)
  const statusLabel = getReturnStatusLabel(returnData.status)
  const reasonLabel = getReturnReasonLabel(returnData.reason_code)
  const resolution = getReturnResolutionLabel(returnData.resolution)
  const refundMethod = getRefundMethodLabel(returnData.refund_method)
  const flowInfo = RETURN_STATUS_FLOW[returnData.status]

  return (
    <div className="space-y-10">
      {/* Back Link */}
      <div>
        <Link href="/account/returns" className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 hover:text-black">
          ← Back to Returns
        </Link>
      </div>

      {/* Header */}
      <section className="border border-gray-200 bg-white px-10 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Return Details</p>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-gray-900">{returnData.id}</h1>
            <p className="text-sm text-gray-500">Order: {returnData.order_id}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center border px-3 py-1 text-xs font-semibold uppercase ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <div className="mt-6 border-t border-gray-200"></div>
      </section>

      {/* Status Info & Next Steps */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="border border-gray-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Current Status</p>
          <p className="mt-3 text-lg font-semibold text-gray-900">{flowInfo.description}</p>
          <p className="mt-2 text-sm text-gray-600">{flowInfo.nextSteps}</p>
        </div>
        <div className="border border-gray-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Timeline</p>
          <p className="mt-3 text-sm text-gray-700">
            <span className="font-semibold">Requested:</span> {formatDate(returnData.created_at)}
          </p>
          {returnData.actual_refund_date && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold">Refunded:</span> {formatDate(returnData.actual_refund_date)}
            </p>
          )}
          {returnData.estimated_refund_date && !returnData.actual_refund_date && (
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-semibold">Est. Refund:</span> {formatDate(returnData.estimated_refund_date)}
            </p>
          )}
        </div>
      </section>

      {/* Return Details Grid */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="border border-gray-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Reason</p>
          <p className="mt-3 text-lg font-semibold text-gray-900">{reasonLabel}</p>
          {returnData.reason_comments && (
            <p className="mt-3 text-sm italic text-gray-600">"{returnData.reason_comments}"</p>
          )}
        </div>
        <div className="border border-gray-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Resolution</p>
          <p className="mt-3 text-lg font-semibold text-gray-900">{resolution}</p>
        </div>
        <div className="border border-gray-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refund Method</p>
          <p className="mt-3 text-lg font-semibold text-gray-900">{refundMethod}</p>
        </div>
      </section>

      {/* Refund Amount */}
      {returnData.refund_amount && (
        <section className="border border-black bg-white p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refund Amount</p>
              <p className="mt-3 text-4xl font-semibold text-black">
                {formatCurrency(returnData.refund_amount)}
              </p>
            </div>
            {returnData.pickup_scheduled_date && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Pickup Scheduled</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(returnData.pickup_scheduled_date)}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pickup Information */}
      {returnData.courier_name && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="border border-gray-200 bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Courier</p>
            <p className="mt-3 text-lg font-semibold text-gray-900">{returnData.courier_name}</p>
            {returnData.tracking_number && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Tracking Number</p>
                <p className="mt-1 text-sm font-mono text-gray-700">{returnData.tracking_number}</p>
                {returnData.tracking_link && (
                  <a
                    href={returnData.tracking_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block border border-black bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-gray-900"
                  >
                    Track Shipment →
                  </a>
                )}
              </div>
            )}
          </div>
          {returnData.pickup_address && (
            <div className="border border-gray-200 bg-white p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Pickup Address</p>
              <div className="mt-3 space-y-1 text-sm text-gray-700">
                {typeof returnData.pickup_address === 'object' && (
                  <>
                    {returnData.pickup_address?.fullName && <p>{returnData.pickup_address.fullName}</p>}
                    {returnData.pickup_address?.addressLine1 && <p>{returnData.pickup_address.addressLine1}</p>}
                    {returnData.pickup_address?.city && (
                      <p>
                        {returnData.pickup_address.city}
                        {returnData.pickup_address?.state && `, ${returnData.pickup_address.state}`}
                        {returnData.pickup_address?.pincode && ` ${returnData.pickup_address.pincode}`}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Items Being Returned */}
      {returnData.items && returnData.items.length > 0 && (
        <section className="space-y-4">
          <div className="border border-gray-200 bg-white px-8 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Items</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">Items Being Returned</h2>
          </div>
          <div className="space-y-3">
            {returnData.items.map((item) => (
              <div key={item.id} className="border border-gray-200 bg-white p-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                    {item.variant_label && <p className="text-xs text-gray-600">{item.variant_label}</p>}
                    <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Unit Price</p>
                    {item.unit_price && <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(item.unit_price)}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timeline/Status History */}
      <section className="border border-gray-200 bg-white p-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Return Timeline</h2>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          {[
            { step: 'Requested', date: returnData.created_at },
            { step: 'Approved', active: ['APPROVED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'INSPECTION_PENDING', 'REFUNDED', 'REJECTED'].includes(returnData.status) },
            { step: 'In Transit', active: ['IN_TRANSIT', 'INSPECTION_PENDING', 'REFUNDED'].includes(returnData.status) },
            { step: 'Inspection', active: ['INSPECTION_PENDING', 'REFUNDED'].includes(returnData.status) },
            { step: 'Completed', active: ['REFUNDED', 'REJECTED'].includes(returnData.status), date: returnData.actual_refund_date || returnData.updated_at },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`h-3 w-3 ${item.active ? 'bg-black' : 'bg-gray-300'}`}></div>
              <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${item.active ? 'text-black' : 'text-gray-400'}`}>
                {item.step}
              </span>
              {idx < 4 && <span className={`h-px w-8 ${item.active ? 'bg-black' : 'bg-gray-300'}`}></span>}
            </div>
          ))}
        </div>
      </section>

      {/* Footer Actions */}
      <section className="flex gap-3">
        <Link
          href="/account/returns"
          className="flex-1 border border-gray-200 bg-white px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 hover:border-black hover:text-black"
        >
          Back to Returns
        </Link>
      </section>
    </div>
  )
}
