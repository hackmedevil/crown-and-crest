import { useMemo } from 'react'
import { PDPVariant } from '@/components/VariantSelector'
import { ProductMedia } from '@/types/product'

type VariantMediaItem = {
  id: string
  variant_id: string
  cloudinary_public_id: string
  resource_type: 'image' | 'video'
  width: number | null
  height: number | null
  aspect_ratio: number | null
  alt_text: string | null
  position: number
  is_primary: boolean
}

/**
 * Custom hook to compute active media based on selected variant.
 * Implements storefront media selection rules from MEDIA_DATA_MODEL_CLOUDINARY.md
 * 
 * Rules:
 * 1. If variant is selected, enabled, and has active media → use variant media
 * 2. Otherwise → fallback to product media
 * 
 * @param selectedVariant - Currently selected variant (or null)
 * @param productMedia - Product-level media (always available)
 * @returns Active media array to display in gallery
 */
export function useVariantMedia(
  selectedVariant: PDPVariant | null,
  productMedia: ProductMedia[]
): (ProductMedia | VariantMediaItem)[] {
  return useMemo(() => {
    // Rule 1: Variant selected, enabled, and has media → use variant media
    if (
      selectedVariant &&
      selectedVariant.enabled &&
      selectedVariant.media &&
      selectedVariant.media.length > 0
    ) {
      return selectedVariant.media as VariantMediaItem[]
    }

    // Rule 2: Fallback to product media
    // This covers:
    // - No variant selected
    // - Variant selected but disabled
    // - Variant selected but no media
    return productMedia
  }, [selectedVariant, productMedia])
}
