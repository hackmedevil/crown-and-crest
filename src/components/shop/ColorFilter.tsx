'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Minus, Plus, Check } from 'lucide-react'

const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Yellow', hex: '#F59E0B' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Purple', hex: '#A855F7' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Beige', hex: '#D4A574' },
]

export default function ColorFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  
  const selectedColors = searchParams?.get('color')?.split(',').filter(Boolean) || []

  const toggleColor = (colorName: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    let colors = selectedColors

    if (colors.includes(colorName.toLowerCase())) {
      colors = colors.filter(c => c !== colorName.toLowerCase())
    } else {
      colors = [...colors, colorName.toLowerCase()]
    }

    if (colors.length > 0) {
      params.set('color', colors.join(','))
    } else {
      params.delete('color')
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
        <span className="font-semibold text-gray-900">Color</span>
        {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-4 grid grid-cols-6 gap-3">
          {COLORS.map((color) => {
            const isSelected = selectedColors.includes(color.name.toLowerCase())
            return (
              <button
                key={color.name}
                onClick={() => toggleColor(color.name)}
                className="group relative"
                title={color.name}
              >
                <div
                  className={`
                    w-10 h-10 rounded-full border-2 transition-all
                    ${isSelected ? 'border-black ring-2 ring-black ring-offset-2' : 'border-gray-300 hover:border-gray-400'}
                    ${color.name === 'White' ? 'shadow-sm' : ''}
                  `}
                  style={{ backgroundColor: color.hex }}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check 
                      className="w-5 h-5" 
                      style={{ 
                        color: color.name === 'White' || color.name === 'Yellow' || color.name === 'Beige' 
                          ? '#000' 
                          : '#FFF' 
                      }} 
                    />
                  </div>
                )}
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {color.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
