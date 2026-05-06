/**
 * Variant Availability Matrix Builder
 * 
 * Creates data structure showing which variant combinations are possible.
 * Enables smart variant selector that:
 * - Filters size options based on selected color
 * - Filters color options based on selected size
 * - Grays out unavailable combinations
 * - Shows out-of-stock status
 */

import { AvailabilityMatrix, PDPVariant } from '@/types/pdp'

/**
 * Resolve canonical size value from either explicit `size` column or variant options.
 * Handles products where size is stored only in dynamic attributes.
 */
export function getVariantSizeValue(variant: PDPVariant): string | null {
  const directSize = typeof variant.size === 'string' ? variant.size.trim() : ''
  if (directSize.length > 0) {
    return directSize
  }

  if (!variant.options) {
    return null
  }

  const optionSizeEntry = Object.entries(variant.options).find(([key, value]) => {
    return key.toLowerCase() === 'size' && typeof value === 'string' && value.trim().length > 0
  })

  if (!optionSizeEntry) {
    return null
  }

  return optionSizeEntry[1].trim()
}

export function buildAvailabilityMatrix(
  variants: PDPVariant[]
): AvailabilityMatrix {
  const matrix: AvailabilityMatrix = {
    color_to_sizes: {},
    size_to_colors: {},
    out_of_stock_variants: [],
  }

  // Only process enabled variants
  const enabledVariants = variants.filter((v) => v.enabled)

  // Build mappings
  for (const variant of enabledVariants) {
    const colorGroupId = variant.color_group_id
    const size = getVariantSizeValue(variant)

    // Track out-of-stock variants
    if (variant.is_out_of_stock) {
      matrix.out_of_stock_variants.push(variant.id)
    }

    // Only in-stock variants should contribute to selectable combinations.
    if (variant.is_out_of_stock) {
      continue
    }

    // Build color → sizes mapping
    if (colorGroupId && size) {
      if (!matrix.color_to_sizes[colorGroupId]) {
        matrix.color_to_sizes[colorGroupId] = []
      }
      if (!matrix.color_to_sizes[colorGroupId].includes(size)) {
        matrix.color_to_sizes[colorGroupId].push(size)
      }

      // Build size → colors mapping
      if (!matrix.size_to_colors[size]) {
        matrix.size_to_colors[size] = []
      }
      if (!matrix.size_to_colors[size].includes(colorGroupId)) {
        matrix.size_to_colors[size].push(colorGroupId)
      }
    }

    // Handle variants with dynamic attributes (non-color/size)
    if (variant.options) {
      for (const [key, value] of Object.entries(variant.options)) {
        // Skip color and size as they're handled above
        if (key.toLowerCase() === 'color' || key.toLowerCase() === 'size') {
          continue
        }

        // Build attribute mappings for future extensibility
        // This allows products with attributes like "Material: Cotton|Polyester"
        // to have smart filtering
      }
    }
  }

  // Sort sizes in standard order (XS, S, M, L, XL, XXL, etc.)
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL']
  for (const colorGroupId in matrix.color_to_sizes) {
    matrix.color_to_sizes[colorGroupId].sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.toUpperCase())
      const bIndex = sizeOrder.indexOf(b.toUpperCase())
      
      // If both sizes are in the standard order, sort by that
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      
      // If only one is in standard order, prioritize it
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      
      // Otherwise, alphabetical sort
      return a.localeCompare(b)
    })
  }

  return matrix
}

/**
 * Get available sizes for a specific color group
 */
export function getAvailableSizesForColor(
  matrix: AvailabilityMatrix,
  colorGroupId: string
): string[] {
  return matrix.color_to_sizes[colorGroupId] || []
}

/**
 * Get available colors for a specific size
 */
export function getAvailableColorsForSize(
  matrix: AvailabilityMatrix,
  size: string
): string[] {
  return matrix.size_to_colors[size] || []
}

/**
 * Check if a variant combination is available
 */
export function isVariantAvailable(
  matrix: AvailabilityMatrix,
  variantId: string
): boolean {
  return !matrix.out_of_stock_variants.includes(variantId)
}

/**
 * Find matching variant for given color and size selection
 */
export function findMatchingVariant(
  variants: PDPVariant[],
  colorGroupId: string | null,
  size: string | null,
  otherOptions?: Record<string, string>
): PDPVariant | null {
  return (
    variants.find((variant) => {
      // Must match color group
      if (colorGroupId && variant.color_group_id !== colorGroupId) {
        return false
      }

      // Must match size (including size stored in options)
      if (size && getVariantSizeValue(variant) !== size) {
        return false
      }

      // Must match other dynamic options
      if (otherOptions) {
        for (const [key, value] of Object.entries(otherOptions)) {
          if (variant.options?.[key] !== value) {
            return false
          }
        }
      }

      // Must be enabled
      return variant.enabled && !variant.is_out_of_stock
    }) || null
  )
}
