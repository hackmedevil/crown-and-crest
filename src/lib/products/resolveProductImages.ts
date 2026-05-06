/**
 * Product Image Resolution Module
 * 
 * Establishes single image priority rule for PDP:
 * 1. Variant images (if enable_variant_image_switching = true AND variant selected)
 * 2. Color group images (if variant has color_group_id)
 * 3. Product images (fallback)
 * 
 * This normalizes the fragmented media system identified in audit.
 */

import { PDPImages, ImageResolverParams } from '@/types/pdp'

/**
 * Parse legacy product.images JSONB and image_url fields
 */
function parseProductImages(
  imagesJson: any,
  imageUrlLegacy: string | null
): Array<{ url: string; position: number }> {
  const images: Array<{ url: string; position: number }> = []

  // Handle legacy single image_url field
  if (imageUrlLegacy) {
    images.push({ url: imageUrlLegacy, position: 0 })
  }

  // Handle images JSONB array
  if (Array.isArray(imagesJson)) {
    imagesJson.forEach((img, index) => {
      if (typeof img === 'string') {
        images.push({ url: img, position: imageUrlLegacy ? index + 1 : index })
      } else if (img?.url) {
        images.push({
          url: img.url,
          position: img.position ?? (imageUrlLegacy ? index + 1 : index),
        })
      }
    })
  } else if (typeof imagesJson === 'string') {
    // Handle case where it's a single string URL
    images.push({
      url: imagesJson,
      position: imageUrlLegacy ? 1 : 0,
    })
  }

  // Deduplicate and sort by position
  const uniqueImages = Array.from(
    new Map(images.map((img) => [img.url, img])).values()
  )
  return uniqueImages.sort((a, b) => a.position - b.position)
}

/**
 * Add Cloudinary optimization parameters to reduce payload size
 */
function addImageOptimization(
  url: string,
  opts: { width: number; quality: number }
): string {
  if (!url || url === '/placeholder.jpg') return url

  // Only optimize Cloudinary URLs
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    // Insert transformation parameters after /upload/
    const transformation = `w_${opts.width},q_${opts.quality},f_auto`
    return url.replace('/upload/', `/upload/${transformation}/`)
  }

  return url
}

/**
 * Resolve product images using 3-tier priority system
 */
export function resolveProductImages(params: ImageResolverParams): PDPImages {
  const {
    product,
    selected_variant,
    color_group_images,
    product_images,
  } = params

  // Priority 1: Variant images (if switching enabled and variant selected)
  if (
    product.enable_variant_image_switching &&
    selected_variant?.images?.length
  ) {
    const variantImages = selected_variant.images
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        url: addImageOptimization(img.image_url, { width: 800, quality: 85 }),
        position: img.position,
      }))

    return {
      hero: addImageOptimization(variantImages[0].url, {
        width: 1200,
        quality: 90,
      }),
      gallery: variantImages,
      priority_source: 'variant',
    }
  }

  // Priority 2: Color group images (if variant has color group)
  if (selected_variant?.color_group_id && color_group_images?.length) {
    const colorGroupImages = color_group_images
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        url: addImageOptimization(img.image_url, { width: 800, quality: 85 }),
        position: img.position,
      }))

    return {
      hero: addImageOptimization(colorGroupImages[0].url, {
        width: 1200,
        quality: 90,
      }),
      gallery: colorGroupImages,
      priority_source: 'color_group',
    }
  }

  // Priority 3: Product images (fallback)
  const productImages = [
    ...parseProductImages(product.images, product.image_url),
    ...product_images.map((img) => ({
      url: img.image_url,
      position: img.position,
    })),
  ]

  // Deduplicate and sort
  const uniqueImages = Array.from(
    new Map(productImages.map((img) => [img.url, img])).values()
  ).sort((a, b) => a.position - b.position)

  const optimizedImages = uniqueImages.map((img) => ({
    url: addImageOptimization(img.url, { width: 800, quality: 85 }),
    position: img.position,
  }))

  return {
    hero:
      optimizedImages.length > 0
        ? addImageOptimization(optimizedImages[0].url, {
            width: 1200,
            quality: 90,
          })
        : '/placeholder.jpg',
    gallery: optimizedImages.length > 0 ? optimizedImages : [],
    priority_source: 'product',
  }
}

/**
 * Resolve images for initial page load (no variant selected yet)
 * Uses color group or product images as starting point
 */
export function resolveInitialImages(
  product: {
    images: any
    image_url: string | null
    enable_variant_image_switching: boolean
  },
  color_group_images: Array<{ image_url: string; position: number }>,
  product_images: Array<{ image_url: string; position: number }>
): PDPImages {
  return resolveProductImages({
    product,
    selected_variant: null,
    color_group_images,
    product_images,
  })
}
