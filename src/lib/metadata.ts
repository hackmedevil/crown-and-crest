/**
 * Metadata and SEO helpers for generating dynamic metadata and OG tags
 */

import type { Metadata } from 'next'

export interface ProductMetadataProps {
  name: string
  slug: string
  description?: string | null
  base_price: number
  imageUrl: string
  primaryMediaId?: string
}

/**
 * Generate metadata for a product page
 */
export function generateProductMetadata(product: ProductMetadataProps): Metadata {
  const title = `${product.name} – Crown and Crest`
  const description = product.description || `Shop ${product.name} at Crown and Crest. ₹${product.base_price.toLocaleString('en-IN')}`
  const url = `https://crownandcrest.com/product/${product.slug}`

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: [
        {
          url: product.imageUrl,
          width: 1200,
          height: 1200,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [product.imageUrl],
    },
  }
}

/**
 * Generate metadata for product listing page
 */
export function generatePLPMetadata(): Metadata {
  const title = 'Shop – Crown and Crest'
  const description = 'Discover our curated collection of fine goods. Premium products for discerning customers.'
  const url = 'https://crownandcrest.com/shop'

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

/**
 * Generate robots metadata for page
 * Use 'noindex' for auth, admin, and ephemeral pages
 */
export function getPageRobots(isPublic: boolean = true) {
  if (!isPublic) {
    return { follow: false, index: false }
  }
  return { follow: true, index: true }
}

/**
 * Cloudinary image URL builder with SEO-optimized parameters
 */
export function buildCloudinarySEOImage(
  publicId: string,
  width: number = 1200,
  height?: number
): string {
  const params = [
    `w_${width}`,
    `q_auto`,
    `f_auto`,
    `dpr_auto`,
    height ? `h_${height}` : '',
    `c_limit`,
  ]
    .filter(Boolean)
    .join(',')

  return `https://res.cloudinary.com/crown-and-crest/image/upload/${params}/${publicId}`
}
