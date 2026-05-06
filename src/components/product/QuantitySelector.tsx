'use client'

import { Minus, Plus } from 'lucide-react'

interface QuantitySelectorProps {
  value: number
  max: number
  onChange: (value: number) => void
}

export default function QuantitySelector({ value, max, onChange }: QuantitySelectorProps) {
  const safeMax = Math.max(1, max)

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-gray-700">Quantity</span>
      <div className="inline-flex items-center border border-gray-300 rounded-lg">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="p-2 hover:bg-gray-100 transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-10 text-center text-sm font-semibold">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(safeMax, value + 1))}
          className="p-2 hover:bg-gray-100 transition-colors"
          aria-label="Increase quantity"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <span className="text-xs text-gray-500">Max {safeMax}</span>
    </div>
  )
}
