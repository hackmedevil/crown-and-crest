'use client'

import { useState } from 'react'
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react'

interface MobileFilterBarProps {
  onOpenFilters: () => void
  onOpenSort: () => void
}

export default function MobileFilterBar({ onOpenFilters, onOpenSort }: MobileFilterBarProps) {
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex gap-3">
      <button
        onClick={onOpenFilters}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <SlidersHorizontal className="w-5 h-5" />
        <span>Filters</span>
      </button>
      
      <button
        onClick={onOpenSort}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <ArrowUpDown className="w-5 h-5" />
        <span>Sort</span>
      </button>
    </div>
  )
}
