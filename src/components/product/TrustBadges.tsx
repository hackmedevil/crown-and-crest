'use client'

import { RefreshCw, Truck, ShieldCheck } from 'lucide-react'

/**
 * TrustBadges Component
 * 
 * Displays trust indicators:
 * - Easy Returns
 * - COD Available
 * - Secure Payment
 */
export default function TrustBadges() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8 py-6 border-y border-gray-100">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-gray-700" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">
          Easy Returns
        </span>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <Truck className="w-4 h-4 text-gray-700" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">
          COD Available
        </span>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-gray-700" />
        </div>
        <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">
          Secure Payment
        </span>
      </div>
    </div>
  )
}
