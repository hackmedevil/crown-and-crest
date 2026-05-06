'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Minus, Plus, Star } from 'lucide-react'

const RATINGS = [
  { value: 4, label: '4 stars & above' },
  { value: 3, label: '3 stars & above' },
  { value: 2, label: '2 stars & above' },
  { value: 1, label: '1 star & above' },
]

export default function RatingFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  
  const selectedRating = searchParams?.get('rating') ? Number(searchParams.get('rating')) : null

  const selectRating = (rating: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    
    if (selectedRating === rating) {
      params.delete('rating')
    } else {
      params.set('rating', rating.toString())
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
        <span className="font-semibold text-gray-900">Customer Rating</span>
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-2">
          {RATINGS.map((rating) => {
            const isSelected = selectedRating === rating.value
            return (
              <button
                key={rating.value}
                onClick={() => selectRating(rating.value)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left
                  ${isSelected 
                    ? 'border-black bg-gray-50' 
                    : 'border-transparent hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rating.value 
                          ? 'text-yellow-400 fill-yellow-400' 
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-700">{rating.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
