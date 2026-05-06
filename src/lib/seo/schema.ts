/**
 * SEO Schema and Structured Data Generation
 * 
 * Generates JSON-LD schema markup for products, categories, and pages
 * Supports Google Rich Results (Product snippets, Rich Stars, etc.)
 * 
 * Usage:
 * import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo/schema'
 */

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  basePrice: number
  imageUrl: string
  category?: string
  inStock: boolean
  sku?: string
  brand?: string
  rating?: number
  reviewCount?: number
  url: string
}

export interface Category {
  name: string
  description: string
  url: string
}

export interface BreadcrumbItem {
  name: string
  url: string
}

/**
 * Generate Product schema with pricing and availability
 * https://schema.org/Product
 */
export function generateProductSchema(product: Product) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Crown & Crest',
    },
    image: product.imageUrl,
    url: product.url,
    offers: {
      '@type': 'Offer',
      url: product.url,
      priceCurrency: 'INR',
      price: (product.basePrice / 100).toFixed(2),
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Crown & Crest',
        url: 'https://www.crowncrest.store',
      },
    },
    ...(product.rating && product.reviewCount && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating.toFixed(1),
        reviewCount: product.reviewCount,
        bestRating: '5',
        worstRating: '1',
      },
    }),
  }
}

/**
 * Generate BreadcrumbList schema for navigation
 * https://schema.org/BreadcrumbList
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Generate Organization schema for homepage
 * https://schema.org/Organization
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Organization',
    name: 'Crown & Crest',
    url: 'https://www.crowncrest.store',
    logo: 'https://www.crowncrest.store/logo.png',
    description: 'Luxury fashion and lifestyle brand in India',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-XXXXXXXXXX',
      contactType: 'Customer Service',
    },
    sameAs: [
      'https://www.facebook.com/crowncrest',
      'https://www.instagram.com/crowncrest',
      'https://www.twitter.com/crowncrest',
    ],
  }
}

/**
 * Generate LocalBusiness schema for footer with store info
 * https://schema.org/LocalBusiness
 */
export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org/',
    '@type': 'LocalBusiness',
    name: 'Crown & Crest',
    url: 'https://www.crowncrest.store',
    telephone: '+91-XXXXXXXXXX',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Your Street Address',
      addressLocality: 'Your City',
      addressRegion: 'Your State',
      postalCode: 'Your Postal Code',
      addressCountry: 'IN',
    },
    description: 'Luxury fashion and lifestyle brand',
  }
}

/**
 * Generate AggregateOffer schema for product availability across sizes
 * https://schema.org/AggregateOffer
 */
export function generateAggregateOfferSchema(
  product: Product,
  variants: Array<{ size: string; price: number; inStock: boolean }>
) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.imageUrl,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Crown & Crest',
    },
    aggregateOffer: {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: Math.min(...variants.map(v => v.price / 100)).toFixed(2),
      highPrice: Math.max(...variants.map(v => v.price / 100)).toFixed(2),
      offerCount: variants.length,
      availability: variants.some(v => v.inStock)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      offers: variants.map(variant => ({
        '@type': 'Offer',
        url: product.url,
        priceCurrency: 'INR',
        price: (variant.price / 100).toFixed(2),
        availability: variant.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        priceCurrency_size: variant.size,
      })),
    },
  }
}

/**
 * Generate SameAs array for social linking
 */
export function generateSameAsLinks() {
  return [
    'https://www.facebook.com/crowncrest',
    'https://www.instagram.com/crowncrest',
    'https://www.twitter.com/crowncrest',
    'https://www.linkedin.com/company/crowncrest',
  ]
}

/**
 * Escape string for use in HTML attributes
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

/**
 * Structured data as a script tag JSON-LD
 */
export function renderSchemaScript(schema: Record<string, any>): string {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
}
