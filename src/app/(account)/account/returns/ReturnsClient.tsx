'use client'

import Link from 'next/link'
import { type Return } from '@/types/return'
import ReturnCard from './ReturnCard'
import { RETURN_POLICY, getReturnStatusLabel, getReturnReasonLabel } from '@/lib/returns/constants'

interface ReturnsClientProps {
  activeReturns: Return[]
  completedReturns: Return[]
}

export default function ReturnsClient({ activeReturns, completedReturns }: ReturnsClientProps) {
  return (
    <div className="space-y-10">
      {/* Page Header */}
      <section className="border border-gray-200 bg-white px-10 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Account</p>
            <h1 className="text-4xl font-semibold uppercase tracking-tight text-gray-900">Returns</h1>
            <p className="text-sm text-gray-500">Manage exchanges and refunds.</p>
          </div>
          <Link
            href="#"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 hover:text-black"
          >
            View Return Policy →
          </Link>
        </div>
        <div className="mt-6 border-t border-gray-200"></div>
      </section>

      {/* Start a Return CTA */}
      <section>
        <Link
          href="/account/returns/new"
          className="block border border-black bg-black px-10 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-gray-900"
        >
          Start a Return →
        </Link>
      </section>

      {/* Active Returns */}
      <section className="space-y-4">
        <div className="border border-gray-200 bg-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Status</p>
              <h2 className="mt-1 text-2xl font-semibold text-gray-900">Active Returns</h2>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Count</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{activeReturns.length}</p>
            </div>
          </div>
        </div>

        {activeReturns.length > 0 ? (
          activeReturns.map((returnItem) => <ReturnCard key={returnItem.id} return={returnItem} isActive />)
        ) : (
          <div className="border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">No Active Returns</p>
            <h3 className="mt-3 text-lg font-semibold text-gray-900">Your active returns will appear here.</h3>
            <Link
              href="/account/returns/new"
              className="mt-6 inline-block border border-black bg-black px-6 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-gray-900"
            >
              Start a Return →
            </Link>
          </div>
        )}
      </section>

      {/* Return History */}
      <section className="space-y-4">
        <div className="border border-gray-200 bg-white px-8 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">History</p>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">Completed Returns</h2>
          </div>
        </div>

        {completedReturns.length > 0 ? (
          completedReturns.map((returnItem) => <ReturnCard key={returnItem.id} return={returnItem} />)
        ) : (
          <div className="border border-gray-200 bg-white p-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">No Return History</p>
            <h3 className="mt-3 text-lg font-semibold text-gray-900">Your completed returns will appear here.</h3>
          </div>
        )}
      </section>

      {/* Return Policy Info */}
      <section className="border border-gray-200 bg-white">
        <details className="px-8 py-6">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-[0.18em] text-gray-600">
            Return Policy Information
          </summary>
          <div className="mt-6 grid gap-8 border-t border-gray-200 pt-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Return Window</h3>
                <p className="mt-2 text-sm text-gray-700">{RETURN_POLICY.window_days} days from delivery</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Refund Processing</h3>
                <p className="mt-2 text-sm text-gray-700">{RETURN_POLICY.refund_processing_days} business days</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Condition Requirements</h3>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {RETURN_POLICY.conditions.map((condition, idx) => (
                    <li key={idx}>• {condition}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </details>
      </section>
    </div>
  )
}
