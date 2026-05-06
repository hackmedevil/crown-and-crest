/**
 * HOMEPAGE DATA ACCESS
 * 
 * Server-only function to fetch homepage sections with collections.
 * This is the single source of truth for homepage content.
 * 
 * RULES:
 * - Server-only (never import on client)
 * - Read-only (no mutations)
 * - No auth checks (public data)
 * - No caching logic (handled by Next.js)
 * - Returns typed, clean data structure
 */

import { supabaseServer } from '@/lib/supabase/server'
import type { HomepageData, HomepageSectionWithCollection } from '@/types/homepage'
import type { CollectionWithProducts } from '@/types/collection'

/**
 * Fetch all active homepage sections with their collections and products
 * 
 * @returns {Promise<HomepageData>} Complete homepage data structure
 * @throws {Error} If database query fails
 * 
 * @example
 * ```tsx
 * // In a Server Component
 * import { getHomepageData } from '@/lib/homepage/getHomepageData'
 * 
 * export default async function HomePage() {
 *   const data = await getHomepageData()
 *   return <HomepageRenderer sections={data.sections} />
 * }
 * ```
 */
export async function getHomepageData(): Promise<HomepageData> {
  const supabase = supabaseServer

  try {
    // Step 1: Fetch all active homepage sections ordered by position
    const { data: sections, error: sectionsError } = await supabase
      .from('homepage_sections')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })

    if (sectionsError) {
      console.error('Error fetching homepage sections:', sectionsError)
      throw new Error('Failed to fetch homepage sections')
    }

    if (!sections || sections.length === 0) {
      // No sections configured, return empty data
      return { sections: [] }
    }

    // Step 2: Get all unique collection IDs from sections
    const collectionIds = sections
      .map(section => section.collection_id)
      .filter((id): id is string => id !== null)

    if (collectionIds.length === 0) {
      // No collections referenced, return sections without collection data
      return {
        sections: sections.map(section => ({
          ...section,
          collection: null
        }))
      }
    }

    // Step 3: Fetch collections with their items
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        id,
        name,
        slug,
        description,
        is_active,
        created_at,
        updated_at
      `)
      .in('id', collectionIds)
      .eq('is_active', true)

    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError)
      throw new Error('Failed to fetch collections')
    }

    // Step 4: Fetch collection items with product details
    const { data: collectionItems, error: itemsError } = await supabase
      .from('collection_items')
      .select(`
        id,
        collection_id,
        product_id,
        position,
        created_at,
        products!inner (
          id,
          name,
          slug,
          base_price,
          images
        )
      `)
      .in('collection_id', collectionIds)
      .order('position', { ascending: true })

    if (itemsError) {
      console.error('Error fetching collection items:', itemsError)
      throw new Error('Failed to fetch collection items')
    }

    // Step 5: Build collections with products map
    const collectionsMap = new Map<string, CollectionWithProducts>()

    // Initialize collections
    collections?.forEach(collection => {
      collectionsMap.set(collection.id, {
        ...collection,
        products: []
      })
    })

    // Add products to collections
    collectionItems?.forEach(item => {
      const collection = collectionsMap.get(item.collection_id)
      if (collection && item.products) {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        if (product) {
          collection.products.push({
            id: product.id,
            name: product.name,
            slug: product.slug,
            base_price: product.base_price,
            images: product.images || [],
            position: item.position
          })
        }
      }
    })

    // Step 6: Map sections to include collection data
    const sectionsWithCollections: HomepageSectionWithCollection[] = sections.map(section => ({
      id: section.id,
      title: section.title,
      type: section.type,
      position: section.position,
      is_active: section.is_active,
      config: section.config || {},
      created_at: section.created_at,
      updated_at: section.updated_at,
      collection: section.collection_id 
        ? collectionsMap.get(section.collection_id) || null 
        : null
    }))

    return {
      sections: sectionsWithCollections
    }

  } catch (error) {
    console.error('Unexpected error in getHomepageData:', error)
    throw error
  }
}

/**
 * Type guard to check if a section has a collection
 */
export function hasCollection(
  section: HomepageSectionWithCollection
): section is HomepageSectionWithCollection & { collection: CollectionWithProducts } {
  return section.collection !== null
}

/**
 * Get sections by type
 * Useful for rendering specific section types
 */
export function getSectionsByType(
  data: HomepageData,
  type: string
): HomepageSectionWithCollection[] {
  return data.sections.filter(section => section.type === type)
}
