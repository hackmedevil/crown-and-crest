/**
 * COLLECTION TYPES
 * 
 * Defines reusable product collections used throughout the site.
 * Collections can be featured on the homepage, category pages, etc.
 */

export interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CollectionItem {
  id: string
  collection_id: string
  product_id: string
  position: number
  created_at: string
}

/**
 * Collection with nested product data
 * Used when fetching full collection details
 */
export interface CollectionWithProducts extends Collection {
  products: Array<{
    id: string
    name: string
    slug: string
    base_price: number
    images: string[]
    position: number
  }>
}

/**
 * Minimal collection reference
 * Used in homepage sections
 */
export interface CollectionReference {
  id: string
  name: string
  slug: string
}
