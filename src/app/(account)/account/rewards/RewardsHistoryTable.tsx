'use client'

import { RewardsHistoryItem } from '@/types/rewards'

interface RewardsHistoryTableProps {
  items: RewardsHistoryItem[]
}

export default function RewardsHistoryTable({ items }: RewardsHistoryTableProps) {
  const hasItems = items.length > 0

  return (
    <div className="border border-black">
      <div className="grid grid-cols-5 border-b border-black bg-white text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">
        <div className="px-4 py-3">Date</div>
        <div className="px-4 py-3 col-span-2">Activity</div>
        <div className="px-4 py-3 text-right">Points Earned</div>
        <div className="px-4 py-3 text-right">Balance</div>
      </div>

      {hasItems ? (
        items.map((item) => (
          <div key={item.id} className="grid grid-cols-5 border-b border-gray-200 text-sm">
            <div className="px-4 py-4 text-gray-600">{item.date}</div>
            <div className="px-4 py-4 col-span-2 font-medium text-gray-900">{item.activity}</div>
            <div className="px-4 py-4 text-right text-gray-900">
              {item.pointsEarned > 0
                ? `+${item.pointsEarned}`
                : item.pointsUsed > 0
                  ? `-${item.pointsUsed}`
                  : '0'}
            </div>
            <div className="px-4 py-4 text-right text-gray-900">{item.balance}</div>
          </div>
        ))
      ) : (
        <div className="px-4 py-6 text-sm text-gray-600">No rewards activity yet.</div>
      )}
    </div>
  )
}
