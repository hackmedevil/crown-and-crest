'use client'

import { useMemo } from 'react'
import type { PDPVariant, PDPColorGroup, AvailabilityMatrix } from '@/types/pdp'
import { getVariantSizeValue } from '@/lib/products/buildAvailabilityMatrix'

interface VariantSelectorProps {
  variants: PDPVariant[]
  colorGroups: PDPColorGroup[]
  availabilityMatrix: AvailabilityMatrix
  hasSizeVariants: boolean
  selectedColorGroupId: string | null
  selectedSize: string | null
  onColorChange: (colorGroupId: string) => void
  onSizeChange: (size: string) => void
  onSizeGuideClick: () => void
  showSizeGuide: boolean
  onColorHover?: (colorGroupId: string) => void // Phase 3: Image preloading
  onColorLeave?: (colorGroupId: string) => void
}

/**
 * VariantSelector Component
 * 
 * Smart variant selector using availability matrix:
 * - Disables impossible combinations
 * - Size options update based on selected color
 * - Color options update based on selected size
 * - Defaults to valid in-stock variant
 * - Preloads images on hover (Phase 3)
 */
export default function VariantSelector({
  variants,
  colorGroups,
  availabilityMatrix,
  hasSizeVariants,
  selectedColorGroupId,
  selectedSize,
  onColorChange,
  onSizeChange,
  onSizeGuideClick,
  showSizeGuide,
  onColorHover,
  onColorLeave
}: VariantSelectorProps) {
  const isVariantSellable = (variant: PDPVariant): boolean => {
    if (!variant.enabled) return false
    if (typeof variant.available_to_sell === 'number') {
      return variant.available_to_sell > 0
    }
    return !variant.is_out_of_stock
  }

  const isSizeSellableForColor = (colorGroupId: string, size: string): boolean => {
    return variants.some(v => {
      return (
        v.color_group_id === colorGroupId &&
        getVariantSizeValue(v) === size &&
        isVariantSellable(v)
      )
    })
  }

  // Get available sizes for selected color
  const availableSizes = useMemo(() => {
    if (!hasSizeVariants) {
      return []
    }

    if (!selectedColorGroupId) {
      // No color selected: show all sizes
      return Array.from(
        new Set(
          variants
            .filter(v => v.enabled)
            .map(v => getVariantSizeValue(v))
            .filter(Boolean)
        )
      ) as string[]
    }

    // Show all enabled sizes for selected color; disabled styling handles stock state.
    return Array.from(
      new Set(
        variants
          .filter(v => v.enabled && v.color_group_id === selectedColorGroupId)
          .map(v => getVariantSizeValue(v))
          .filter(Boolean)
      )
    ) as string[]
  }, [selectedColorGroupId, variants, hasSizeVariants])

  // Get available colors for selected size
  const availableColorIds = useMemo(() => {
    if (!hasSizeVariants) {
      return colorGroups
        .filter(cg =>
          variants.some(v => v.color_group_id === cg.id && isVariantSellable(v))
        )
        .map(cg => cg.id)
    }

    if (!selectedSize) {
      // No size selected: show colors that have at least one sellable variant
      return colorGroups
        .filter(cg => variants.some(v => v.color_group_id === cg.id && isVariantSellable(v)))
        .map(cg => cg.id)
    }

    // Selected size: show colors that can actually sell this size now
    return colorGroups
      .filter(cg => isSizeSellableForColor(cg.id, selectedSize))
      .map(cg => cg.id)
  }, [selectedSize, colorGroups, hasSizeVariants, variants])

  // Sort sizes in standard order
  const sortedSizes = useMemo(() => {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL']
    return [...availableSizes].sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.toUpperCase())
      const bIndex = sizeOrder.indexOf(b.toUpperCase())
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })
  }, [availableSizes])

  return (
    <div className="space-y-6">
      {/* Color Selector */}
      {colorGroups.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Color:{' '}
              <span className="font-medium text-gray-900">
                {selectedColorGroupId
                  ? colorGroups.find(cg => cg.id === selectedColorGroupId)?.name || 'Not selected'
                  : 'Select a color'}
              </span>
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {colorGroups.map(colorGroup => {
              const isSelected = selectedColorGroupId === colorGroup.id
              const isAvailable = availableColorIds.includes(colorGroup.id)
              const isDisabled = !isAvailable

              return (
                <button
                  key={colorGroup.id}
                  type="button"
                  onClick={() => {
                    if (!isDisabled) {
                      onColorChange(colorGroup.id)
                    }
                  }}
                  onMouseEnter={() => {
                    if (!isDisabled && onColorHover) {
                      onColorHover(colorGroup.id)
                    }
                  }}
                  onFocus={() => {
                    if (!isDisabled && onColorHover) {
                      onColorHover(colorGroup.id)
                    }
                  }}
                  onMouseLeave={() => {
                    if (onColorLeave) {
                      onColorLeave(colorGroup.id)
                    }
                  }}
                  onBlur={() => {
                    if (onColorLeave) {
                      onColorLeave(colorGroup.id)
                    }
                  }}
                  disabled={isDisabled}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-black ring-1 ring-black ring-offset-2'
                      : isDisabled
                      ? 'border-gray-200 opacity-40 cursor-not-allowed'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  title={`${colorGroup.name}${isDisabled ? ' (Not available in selected size)' : ''}`}
                  aria-label={`Select ${colorGroup.name} color`}
                  aria-disabled={isDisabled}
                  aria-pressed={isSelected}
                >
                  <div
                    className={`h-full w-full rounded-full border ${
                      isDisabled ? 'border-gray-300' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: colorGroup.primary_hex }}
                  />
                </button>
              )
            })}
          </div>
          {hasSizeVariants && selectedSize && availableColorIds.length === 0 && (
            <p className="text-xs text-red-600 mt-2">
              No colors available in size {selectedSize}
            </p>
          )}
        </div>
      )}

      {/* Size Selector */}
      {hasSizeVariants && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Size:{' '}
              <span className="font-medium text-gray-900">
                {selectedSize || 'Select a size'}
              </span>
            </p>
            {showSizeGuide && (
              <button
                type="button"
                onClick={onSizeGuideClick}
                className="text-xs font-bold text-black underline decoration-black underline-offset-4 hover:text-gray-700 transition-colors"
              >
                SIZE CHART
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {sortedSizes.map(size => {
              const isSelected = selectedSize === size
              const isDisabled =
                selectedColorGroupId !== null &&
                !isSizeSellableForColor(selectedColorGroupId, size)

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    if (!isDisabled) {
                      onSizeChange(size)
                    }
                  }}
                  disabled={isDisabled}
                  className={`h-10 min-w-[3rem] px-4 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                      : isDisabled
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed line-through'
                      : 'border-gray-200 text-gray-900 hover:border-gray-400'
                  }`}
                  title={isDisabled ? `${size} (Out of stock in selected color)` : size}
                  aria-label={`Select size ${size}`}
                  aria-disabled={isDisabled}
                  aria-pressed={isSelected}
                >
                  {size}
                </button>
              )
            })}
          </div>
          {selectedColorGroupId && sortedSizes.length === 0 && (
            <p className="text-xs text-red-600 mt-2">
              No sizes available in selected color
            </p>
          )}
        </div>
      )}

      {/* Legacy: Attribute-based selection (for products without color groups) */}
      {/* Removed legacy product/variant selection fallback message for minimal UI */}
    </div>
  )
}
