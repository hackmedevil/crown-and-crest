'use client'

import { useEffect, useMemo, useState } from 'react'

// Types from PDP_VARIANT_SELECTION_CONTRACT.md
export type PDPVariant = {
  id: string
  product_id: string
  sku: string
  size: string | null
  color: string | null
  price_override: number | null
  stock_quantity: number
  available_to_sell?: number
  is_out_of_stock?: boolean
  low_stock_threshold: number
  enabled: boolean
  position: number
  created_at: string
  media?: {
    id: string
    variant_id: string
    cloudinary_public_id: string
    resource_type: 'image' | 'video'
    is_primary: boolean
    position: number
    alt_text?: string | null
  }[]
}

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

type VariantSelectorProps = {
  variants: PDPVariant[]
  basePrice: number
  productName: string
  onVariantChange?: (variant: PDPVariant | null) => void
}

function getStockStatus(variant: PDPVariant): StockStatus {
  if (variant.stock_quantity === 0) return 'out_of_stock'
  if (variant.stock_quantity >= 1 && variant.stock_quantity <= 10) return 'low_stock'
  return 'in_stock'
}

function getStockDisplayText(status: StockStatus, quantity: number): string {
  switch (status) {
    case 'out_of_stock':
      return 'Out of Stock'
    case 'low_stock':
      return `Only ${quantity} left in stock`
    case 'in_stock':
      return 'In Stock'
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function getStockColor(status: StockStatus): string {
  switch (status) {
    case 'out_of_stock':
      return 'text-red-600 dark:text-red-400'
    case 'low_stock':
      return 'text-orange-600 dark:text-orange-400'
    case 'in_stock':
      return 'text-green-600 dark:text-green-400'
  }
}

function getAvailableColorsForSize(variants: PDPVariant[], size: string): string[] {
  return Array.from(
    new Set(
      variants
        .filter((v) => v.enabled && v.size === size && v.color)
        .map((v) => v.color!)
    )
  ).sort()
}

function getAvailableSizesForColor(variants: PDPVariant[], color: string): string[] {
  const sizes = Array.from(
    new Set(
      variants
        .filter((v) => v.enabled && v.color === color && v.size)
        .map((v) => v.size!)
    )
  )

  // Natural size ordering
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  return sizes.sort((a, b) => {
    const aIdx = sizeOrder.indexOf(a)
    const bIdx = sizeOrder.indexOf(b)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    return a.localeCompare(b)
  })
}

function getVariantByAttributes(
  variants: PDPVariant[],
  size: string | null,
  color: string | null
): PDPVariant | undefined {
  return variants.find((v) => v.enabled && v.size === size && v.color === color)
}

function computeInitialAvailableOptions(variants: PDPVariant[]): {
  sizes: string[]
  colors: string[]
} {
  const sizes = Array.from(
    new Set(variants.filter((v) => v.enabled && v.size).map((v) => v.size!))
  )
  const colors = Array.from(
    new Set(variants.filter((v) => v.enabled && v.color).map((v) => v.color!))
  )

  // Apply natural ordering to sizes
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  const sortedSizes = sizes.sort((a, b) => {
    const aIdx = sizeOrder.indexOf(a)
    const bIdx = sizeOrder.indexOf(b)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    return a.localeCompare(b)
  })

  return {
    sizes: sortedSizes,
    colors: colors.sort(),
  }
}

function findDefaultVariant(variants: PDPVariant[]): PDPVariant | null {
  // Prefer first enabled + in-stock variant
  const inStock = variants.find((v) => v.enabled && v.stock_quantity > 0)
  if (inStock) return inStock

  // Fallback to first enabled variant
  const enabled = variants.find((v) => v.enabled)
  return enabled || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function VariantSelector({
  variants,
  basePrice,
  productName,
  onVariantChange,
}: VariantSelectorProps) {
  const defaultVariant = useMemo(() => findDefaultVariant(variants), [variants])
  const [selectedSize, setSelectedSize] = useState<string | null>(defaultVariant?.size ?? null)
  const [selectedColor, setSelectedColor] = useState<string | null>(defaultVariant?.color ?? null)

  // Compute available options FIRST (needed by selectedVariant)
  const { sizes: allSizes, colors: allColors } = useMemo(
    () => computeInitialAvailableOptions(variants),
    [variants]
  )

  const selectedVariant = useMemo(() => {
    // Determine which options actually exist in the variants
    const hasSizeOptions = allSizes.length > 0
    const hasColorOptions = allColors.length > 0

    // If product has both options, require both to be selected
    if (hasSizeOptions && hasColorOptions) {
      if (selectedSize && selectedColor) {
        return getVariantByAttributes(variants, selectedSize, selectedColor) || null
      }
      return null
    }

    // If product only has size, only require size
    if (hasSizeOptions && !hasColorOptions && selectedSize) {
      return getVariantByAttributes(variants, selectedSize, null) || null
    }

    // If product only has color, only require color
    if (!hasSizeOptions && hasColorOptions && selectedColor) {
      return getVariantByAttributes(variants, null, selectedColor) || null
    }

    // If no options at all, return first enabled variant
    if (!hasSizeOptions && !hasColorOptions) {
      return variants.find(v => v.enabled) || null
    }

    return null
  }, [selectedSize, selectedColor, variants, allSizes.length, allColors.length])

  const productLabel = productName || 'product'

  // Compute available options based on current selection
  const availableColors = selectedSize
    ? getAvailableColorsForSize(variants, selectedSize)
    : allColors
  const availableSizes = selectedColor
    ? getAvailableSizesForColor(variants, selectedColor)
    : allSizes

  useEffect(() => {
    onVariantChange?.(selectedVariant)
  }, [selectedVariant, onVariantChange])

  const displayedPrice = selectedVariant?.price_override ?? basePrice
  const hasPriceChanged =
    selectedVariant && selectedVariant.price_override !== null && selectedVariant.price_override !== basePrice

  const stockStatus = selectedVariant ? getStockStatus(selectedVariant) : null

  const handleSizeChange = (size: string) => {
    setSelectedSize(size)
    // If selected color is not available for this size, reset color
    const colorsForSize = getAvailableColorsForSize(variants, size)
    if (selectedColor && !colorsForSize.includes(selectedColor)) {
      setSelectedColor(null)
    }
  }

  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    // If selected size is not available for this color, reset size
    const sizesForColor = getAvailableSizesForColor(variants, color)
    if (selectedSize && !sizesForColor.includes(selectedSize)) {
      setSelectedSize(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Price Display */}
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-slate-900 dark:text-white">
          ₹{displayedPrice.toLocaleString('en-IN')}
        </p>
        {hasPriceChanged && (
          <p className="text-lg text-slate-500 line-through dark:text-slate-400">
            ₹{basePrice.toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {/* Stock Status */}
      {stockStatus && (
        <div className={`text-sm font-medium ${getStockColor(stockStatus)}`}>
          {getStockDisplayText(stockStatus, selectedVariant?.stock_quantity || 0)}
        </div>
      )}

      {/* Size Selector */}
      {allSizes.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Size for {productLabel}
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select size">
            {allSizes.map((size) => {
              const isAvailable = availableSizes.includes(size)
              const isSelected = selectedSize === size
              return (
                <button
                  key={size}
                  onClick={() => handleSizeChange(size)}
                  disabled={!isAvailable}
                  className={`min-w-[3rem] rounded-md border-2 px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${isSelected
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : isAvailable
                      ? 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-slate-500'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
                    }`}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Size ${size}`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Color Selector */}
      {allColors.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Color
          </label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select color">
            {allColors.map((color) => {
              const isAvailable = availableColors.includes(color)
              const isSelected = selectedColor === color
              return (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  disabled={!isAvailable}
                  className={`min-w-[4rem] rounded-md border-2 px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 ${isSelected
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                    : isAvailable
                      ? 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:border-slate-500'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600'
                    }`}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Color ${color}`}
                >
                  {color}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Selection Status */}
      {!selectedVariant && (allSizes.length > 0 || allColors.length > 0) && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Please select a {allSizes.length > 0 && allColors.length > 0 ? 'size and color' : allSizes.length > 0 ? 'size' : 'color'}
        </p>
      )}

      {/* FUTURE: Media switching hook will go here */}
      {/* When selectedVariant changes, parent component should:
          1. Check if selectedVariant has variant_media (selectedVariant.media?.length > 0)
          2. If yes, pass selectedVariant.media to <ProductGallery media={...} />
          3. If no, keep using product_media
          See: MEDIA_DATA_MODEL_CLOUDINARY.md and PDP_VARIANT_SELECTION_CONTRACT.md */}
    </div>
  )
}
