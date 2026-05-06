/**
 * Cloudinary Image URL Optimization
 * 
 * Applies performance transformations to Cloudinary URLs:
 * - f_auto: Automatic format selection (WebP, AVIF)
 * - q_auto: Automatic quality optimization
 * - w_auto: Automatic responsive width
 * - dpr_auto: Device pixel ratio optimization
 * 
 * For non-Cloudinary URLs, returns the original URL.
 */

interface CloudinaryOptimizeOptions {
  /** Target width for responsive sizing */
  width?: number
  /** Quality level (default: auto) */
  quality?: 'auto' | 'auto:low' | 'auto:good' | 'auto:best' | number
  /** Format (default: auto) */
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png'
  /** Enable DPR optimization (default: true) */
  dpr?: boolean | number
}

/**
 * Optimize a Cloudinary image URL for performance
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: CloudinaryOptimizeOptions = {}
): string {
  // Only process Cloudinary URLs
  if (!url || !url.includes('res.cloudinary.com')) {
    return url
  }

  const {
    width,
    quality = 'auto',
    format = 'auto',
    dpr = true
  } = options

  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Find the upload segment index
    const uploadIndex = pathParts.findIndex(part => part === 'upload')
    if (uploadIndex === -1) return url

    // Build transformation string
    const transformations: string[] = []
    
    if (format) transformations.push(`f_${format}`)
    if (quality) transformations.push(`q_${quality}`)
    if (width) transformations.push(`w_${width}`)
    if (dpr === true) transformations.push('dpr_auto')
    else if (typeof dpr === 'number') transformations.push(`dpr_${dpr}`)

    // Insert transformations after /upload/
    pathParts.splice(uploadIndex + 1, 0, transformations.join(','))
    
    urlObj.pathname = pathParts.join('/')
    return urlObj.toString()
  } catch (error) {
    console.error('[Cloudinary] Failed to optimize URL:', error)
    return url
  }
}

/**
 * Optimize multiple image URLs
 */
export function optimizeCloudinaryUrls(
  urls: string[],
  options?: CloudinaryOptimizeOptions
): string[] {
  return urls.map(url => optimizeCloudinaryUrl(url, options))
}
