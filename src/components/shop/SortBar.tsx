'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpDown } from 'lucide-react'

const SORT_OPTIONS = [
  { value: 'ranking', label: 'Best Match' },
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popularity', label: 'Most Popular' },
]

export default function SortBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentSort = searchParams?.get('sort') || 'ranking'

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    
    if (value === 'ranking') {
      params.delete('sort')
    } else {
      params.set('sort', value)
    }

    // Reset to page 1 when sort changes
    params.delete('page')
    
    router.push(`/shop?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
      <ArrowUpDown className="w-5 h-5 text-gray-500" />
      <span className="text-sm text-gray-700 font-medium">Sort by:</span>
      
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="text-sm font-medium text-gray-900 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black focus:border-transparent bg-white cursor-pointer"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
