'use client'

import { ShopSort } from './types'

interface ShopSortDropdownProps {
  value: ShopSort
  onChange: (value: ShopSort) => void
}

export default function ShopSortDropdown({ value, onChange }: ShopSortDropdownProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700">
      <span>Sort by</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ShopSort)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value="ranking">Ranking</option>
        <option value="price_low_high">Price: Low to High</option>
        <option value="price_high_low">Price: High to Low</option>
        <option value="newest">Newest</option>
        <option value="rating">Rating</option>
      </select>
    </label>
  )
}
