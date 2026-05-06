'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Minus, Plus, Check } from 'lucide-react'

const OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
]

export default function AvailabilityFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  
  const inStock = searchParams?.get('in_stock')

  const toggleAvailability = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    
    if (value === 'in_stock') {
      if (inStock === 'true') {
        params.delete('in_stock')
      } else {
        params.set('in_stock', 'true')
        params.delete('out_of_stock')
      }
    } else {
      if (inStock === 'false') {
        params.delete('in_stock')
      } else {
        params.set('in_stock', 'false')
      }
    }

    // Reset to page 1
    params.delete('page')
    
    router.push(`/shop?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-semibold text-gray-900">Availability</span>
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-2">
          {OPTIONS.map((option) => {
            const isSelected = option.value === 'in_stock' 
              ? inStock === 'true'
              : inStock === 'false'
            
            return (
              <button
                key={option.value}
                onClick={() => toggleAvailability(option.value)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left
                  ${isSelected 
                    ? 'border-black bg-gray-50' 
                    : 'border-transparent hover:bg-gray-50'
                  }
                `}
              >
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${isSelected ? 'border-black bg-black' : 'border-gray-300'}
                `}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-700">{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
