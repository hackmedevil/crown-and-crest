'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import PriceFilter from './PriceFilter'
import SizeFilter from './SizeFilter'
import ColorFilter from './ColorFilter'
import RatingFilter from './RatingFilter'
import AvailabilityFilter from './AvailabilityFilter'

interface FiltersDrawerProps {
  isOpen: boolean
  onClose: () => void
  minPrice?: number
  maxPrice?: number
}

export default function FiltersDrawer({
  isOpen,
  onClose,
  minPrice = 0,
  maxPrice = 10000
}: FiltersDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-full max-w-sm bg-white z-50 lg:hidden overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close filters"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters Content */}
        <div className="p-4 space-y-0">
          <PriceFilter minPrice={minPrice} maxPrice={maxPrice} />
          <SizeFilter />
          <ColorFilter />
          <RatingFilter />
          <AvailabilityFilter />
        </div>

        {/* Footer - Apply Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            View Results
          </button>
        </div>
      </div>
    </>
  )
}
