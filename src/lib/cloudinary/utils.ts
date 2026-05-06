// Client-safe Cloudinary URL utilities for storefront image rendering
// Builds delivery URLs from public_id; no secrets required

export type CloudinaryImageOptions = {
  width?: number
  height?: number
  quality?: number | 'auto'
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
  crop?: 'fill' | 'limit' | 'fit' | 'scale' | 'thumb'
  gravity?: 'auto' | 'face' | 'center'
  dpr?: number | 'auto'
}

/**
 * Build a Cloudinary delivery URL from public_id and optional transformation params.
 * Safe for client and server; does not expose secrets.
 * 
 * @param publicId - Cloudinary public_id (from product_media or variant_media)
 * @param options - Transformation options (width, quality, format, etc.)
 * @returns Full Cloudinary URL
 * 
 * @example
 * buildCloudinaryUrl('products/abc123/primary', { width: 800, quality: 'auto', format: 'auto' })
 * // => https://res.cloudinary.com/<cloud>/image/upload/w_800,q_auto,f_auto/products/abc123/primary
 */
export function buildCloudinaryUrl(
  publicId: string,
  options: CloudinaryImageOptions = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) {
    console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set; returning placeholder')
    return '/placeholder.jpg' // Fallback for local dev without Cloudinary
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    gravity,
    dpr = 'auto',
  } = options

  // Build transformation string (order matters for some params)
  const transforms: string[] = []

  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (crop) transforms.push(`c_${crop}`)
  if (gravity) transforms.push(`g_${gravity}`)
  if (dpr) transforms.push(`dpr_${dpr}`)
  if (quality) transforms.push(`q_${quality}`)
  if (format) transforms.push(`f_${format}`)

  // FUTURE: Add more transformation params (blur, brightness, sharpen, named presets, etc.)

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : ''

  // Base URL: https://res.cloudinary.com/<cloud>/image/upload/<transforms>/<public_id>
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}${publicId}`
}

/**
 * Build a Cloudinary video URL (for future video support).
 * Similar to buildCloudinaryUrl but for resource_type=video.
 * 
 * @param publicId - Cloudinary public_id
 * @param options - Video transformation options
 * @returns Full Cloudinary video URL
 */
export function buildCloudinaryVideoUrl(
  publicId: string,
  options: CloudinaryImageOptions = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!cloudName) {
    console.warn('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME not set; returning placeholder')
    return '/placeholder-video.mp4'
  }

  const { width, height, quality = 'auto', format = 'auto' } = options
  const transforms: string[] = []

  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (quality) transforms.push(`q_${quality}`)
  if (format) transforms.push(`f_${format}`)

  const transformStr = transforms.length > 0 ? `${transforms.join(',')}/` : ''

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformStr}${publicId}`
}

/**
 * Helper to compute responsive sizes attribute for Next.js Image.
 * Useful for mobile-first layouts where image takes varying widths.
 * 
 * @example
 * getResponsiveSizes({ mobile: '100vw', tablet: '50vw', desktop: '400px' })
 * // => "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
 */
export function getResponsiveSizes(config: {
  mobile?: string
  tablet?: string
  desktop: string
}): string {
  const { mobile = '100vw', tablet, desktop } = config
  const parts: string[] = []

  if (mobile) parts.push(`(max-width: 768px) ${mobile}`)
  if (tablet) parts.push(`(max-width: 1024px) ${tablet}`)
  parts.push(desktop)

  return parts.join(', ')
}
