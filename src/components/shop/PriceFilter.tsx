'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'

interface PriceFilterProps {
  minPrice?: number
  maxPrice?: number
}

export default function PriceFilter({ minPrice = 0, maxPrice = 10000 }: PriceFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [priceMin, setPriceMin] = useState(
    searchParams?.get('price_min') ? Number(searchParams.get('price_min')) : minPrice
  )
  const [priceMax, setPriceMax] = useState(
    searchParams?.get('price_max') ? Number(searchParams.get('price_max')) : maxPrice
  )
  const [isOpen, setIsOpen] = useState(true)

  const updateUrl = (min: number, max: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    
    if (min > minPrice) {
      params.set('price_min', min.toString())
    } else {
      params.delete('price_min')
    }
    
    if (max < maxPrice) {
      params.set('price_max', max.toString())
    } else {
      params.delete('price_max')
    }

    // Reset to page 1 when filters change
    params.delete('page')
    
    router.push(`/shop?${params.toString()}`, { scroll: false })
  }

  const handleApply = () => {
    updateUrl(priceMin, priceMax)
  }

  const handleReset = () => {
    setPriceMin(minPrice)
    setPriceMax(maxPrice)
    updateUrl(minPrice, maxPrice)
  }

  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-semibold text-gray-900">Price Range</span>
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4">
          {/* Min/Max Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Min</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(Number(e.target.value))}
                  min={minPrice}
                  max={priceMax}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">Max</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  min={priceMin}
                  max={maxPrice}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Range Slider */}
          <div className="relative pt-1">
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceMin}
              onChange={(e) => setPriceMin(Number(e.target.value))}
              className="absolute w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{ zIndex: priceMin > maxPrice - 100 ? 5 : 3 }}
            />
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceMax}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              className="absolute w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer"
              style={{ zIndex: 4 }}
            />
          </div>

          {/* Apply/Reset Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
