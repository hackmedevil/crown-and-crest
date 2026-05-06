'use client'

import { ShopFiltersPayload } from './types'

interface ShopFiltersProps {
  filters: ShopFiltersPayload
  selectedBrands: string[]
  selectedSizes: string[]
  selectedColors: string[]
  minPrice?: number
  maxPrice?: number
  minAvailablePrice: number
  maxAvailablePrice: number
  onBrandChange: (next: string[]) => void
  onSizeChange: (next: string[]) => void
  onColorChange: (next: string[]) => void
  onPriceChange: (min?: number, max?: number) => void
  onClear: () => void
}

function toggleValue(current: string[], value: string) {
  if (current.includes(value)) return current.filter((v) => v !== value)
  return [...current, value]
}

export default function ShopFilters({
  filters,
  selectedBrands,
  selectedSizes,
  selectedColors,
  minPrice,
  maxPrice,
  minAvailablePrice,
  maxAvailablePrice,
  onBrandChange,
  onSizeChange,
  onColorChange,
  onPriceChange,
  onClear
}: ShopFiltersProps) {
  return (
    <div className="space-y-6 rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button className="text-sm text-gray-600 underline" onClick={onClear}>
          Clear
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Brand</h3>
        <div className="space-y-1">
          {filters.brands.map((item) => (
            <label key={item.value} className="flex cursor-pointer items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(item.value)}
                  onChange={() => onBrandChange(toggleValue(selectedBrands, item.value))}
                />
                {item.value}
              </span>
              <span className="text-gray-500">{item.count}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Size</h3>
        <div className="space-y-1">
          {filters.sizes.map((item) => (
            <label key={item.value} className="flex cursor-pointer items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedSizes.includes(item.value)}
                  onChange={() => onSizeChange(toggleValue(selectedSizes, item.value))}
                />
                {item.value}
              </span>
              <span className="text-gray-500">{item.count}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Color</h3>
        <div className="space-y-1">
          {filters.colors.map((item) => (
            <label key={item.value} className="flex cursor-pointer items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedColors.includes(item.value)}
                  onChange={() => onColorChange(toggleValue(selectedColors, item.value))}
                />
                {item.value}
              </span>
              <span className="text-gray-500">{item.count}</span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Price</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder={`${minAvailablePrice}`}
            value={minPrice ?? ''}
            onChange={(e) => onPriceChange(e.target.value ? Number(e.target.value) : undefined, maxPrice)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            type="number"
            placeholder={`${maxAvailablePrice}`}
            value={maxPrice ?? ''}
            onChange={(e) => onPriceChange(minPrice, e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
      </section>
    </div>
  )
}
