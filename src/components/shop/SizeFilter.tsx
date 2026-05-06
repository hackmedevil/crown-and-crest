'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

export default function SizeFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  
  const selectedSizes = searchParams?.get('size')?.split(',').filter(Boolean) || []

  const toggleSize = (size: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    let sizes = selectedSizes

    if (sizes.includes(size)) {
      sizes = sizes.filter(s => s !== size)
    } else {
      sizes = [...sizes, size]
    }

    if (sizes.length > 0) {
      params.set('size', sizes.join(','))
    } else {
      params.delete('size')
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
        <span className="font-semibold text-gray-900">Size</span>
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {SIZES.map((size) => {
            const isSelected = selectedSizes.includes(size)
            return (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all
                  ${isSelected 
                    ? 'border-black bg-black text-white' 
                    : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                  }
                `}
              >
                {size}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
