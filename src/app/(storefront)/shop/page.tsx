import { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase/server'
import type { GridProduct } from '@/types/grid'
import CategoryHeader from '@/components/shop/CategoryHeader'
import FiltersSidebar from '@/components/shop/FiltersSidebar'
import SortBar from '@/components/shop/SortBar'
import ProductGrid from '@/components/shop/ProductGrid'
import Pagination from '@/components/shop/Pagination'
import ShopClientWrapper from '@/components/shop/ShopClientWrapper'

export const metadata: Metadata = {
  title: 'Shop | Crown & Crest',
  description: 'Browse our premium collection of fashion and accessories',
}

export const revalidate = 300 // 5 minutes

interface ShopPageProps {
  searchParams: Promise<{
    category?: string
    collection?: string
    price_min?: string
    price_max?: string
    size?: string
    color?: string
    rating?: string
    in_stock?: string
    sort?: string
    page?: string
  }>
}

const PRODUCTS_PER_PAGE = 24

type SearchParams = {
  category?: string
  collection?: string
  price_min?: string
  price_max?: string
  size?: string
  color?: string
  rating?: string
  in_stock?: string
  sort?: string
  page?: string
}

async function getProducts(params: SearchParams) {
  try {
    const page = Number(params.page) || 1
    const offset = (page - 1) * PRODUCTS_PER_PAGE
    const sortParam = params.sort || 'ranking'
    const sort = sortParam === 'relevance' ? 'ranking' : sortParam
    let rankedProductIds: string[] | null = null

    // Build query
    let query = supabaseServer
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)

    // Apply collection filter from slug
    if (params.collection) {
      const { data: collection } = await supabaseServer
        .from('collections')
        .select('id')
        .eq('slug', params.collection)
        .eq('is_active', true)
        .maybeSingle()

      const collectionAlias =
        params.collection === 'new-arrivals' ? 'new-arrival' : params.collection === 'new-arrival' ? 'new-arrivals' : null

      let resolvedCollection = collection

      if (!resolvedCollection?.id && collectionAlias) {
        const { data: aliasCollection } = await supabaseServer
          .from('collections')
          .select('id')
          .eq('slug', collectionAlias)
          .eq('is_active', true)
          .maybeSingle()

        resolvedCollection = aliasCollection
      }

      if (!resolvedCollection?.id) {
        return { products: [], total: 0 }
      }

      const { data: collectionItems } = await supabaseServer
        .from('collection_items')
        .select('product_id')
        .eq('collection_id', resolvedCollection.id)

      const productIds = [...new Set((collectionItems || []).map((item) => item.product_id))]

      if (productIds.length === 0) {
        return { products: [], total: 0 }
      }

      query = query.in('id', productIds)
    }

    // Apply category filter from slug (used by navbar/mega menu links)
    if (params.category) {
      const { data: allCategories } = await supabaseServer
        .from('categories')
        .select('id, slug, parent_id')
        .eq('is_active', true)

      const matchedCategory = allCategories?.find((category) => category.slug === params.category)

      if (matchedCategory?.id) {
        const descendants: string[] = []
        const queue: string[] = [matchedCategory.id]

        while (queue.length > 0) {
          const current = queue.shift()!
          descendants.push(current)

          const children = (allCategories || [])
            .filter((category) => category.parent_id === current)
            .map((category) => category.id)

          queue.push(...children)
        }

        query = query.in('category_id', descendants)
      } else {
        // Unknown category slug should return no products instead of all products.
        return { products: [], total: 0 }
      }
    }

    if (params.price_min) {
      query = query.gte('base_price', Number(params.price_min))
    }

    if (params.price_max) {
      query = query.lte('base_price', Number(params.price_max))
    }

    if (params.rating) {
      query = query.gte('rating', Number(params.rating))
    }

    if (params.in_stock === 'true') {
      query = query.gt('stock_quantity', 0)
    } else if (params.in_stock === 'false') {
      query = query.eq('stock_quantity', 0)
    }

    if (sort === 'ranking' || sort === 'popularity' || sort === 'trending') {
      const rankingRpc =
        sort === 'trending'
          ? await supabaseServer.rpc('get_trending_products_v3', { p_limit: 1000 })
          : await supabaseServer.rpc('get_global_ranked_products_v3', { p_limit: 1000, p_offset: 0 })

      if (!rankingRpc.error && rankingRpc.data) {
        const ids: string[] = (rankingRpc.data as Array<{ product_id: string }>)
          .map((row: { product_id: string }) => row.product_id)
          .filter(Boolean)

        rankedProductIds = [...new Set(ids)]
      }

      if (!rankingRpc.error && rankedProductIds && rankedProductIds.length === 0) {
        return { products: [], total: 0 }
      }

      if (rankingRpc.error) {
        console.error('Ranking RPC error, falling back to newest sort:', rankingRpc.error.message)
      } else if (rankedProductIds?.length) {
        // Include the most recently created products even if they have not yet
        // been picked up by the materialized V3 ranking refresh. This ensures
        // newly added products are visible immediately on the shop page.
        const { data: recentProducts } = await supabaseServer
          .from('products')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(100)

        const rankedSet = new Set(rankedProductIds)
        const recentMissingIds = (recentProducts || [])
          .map((product) => product.id)
          .filter((id): id is string => Boolean(id) && !rankedSet.has(id))

        if (recentMissingIds.length > 0) {
          rankedProductIds = [...recentMissingIds, ...rankedProductIds]
        }

        query = query.in('id', rankedProductIds)
      }
    }

    // Apply sorting
    switch (sort) {
      case 'ranking':
      case 'trending':
      case 'popularity':
        query = query.order('created_at', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'price_asc':
        query = query.order('base_price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('base_price', { ascending: false })
        break
      case 'rating':
        query = query.order('rating', { ascending: false })
        break
      case 'popularity':
        query = query.order('created_at', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    query = query.range(offset, offset + PRODUCTS_PER_PAGE - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Products fetch error - Details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return { products: [], total: 0 }
    }

    const sortedByRanking = rankedProductIds?.length
      ? [...(data || [])].sort((a, b) => {
          const aRank = rankedProductIds?.indexOf(a.id) ?? Number.MAX_SAFE_INTEGER
          const bRank = rankedProductIds?.indexOf(b.id) ?? Number.MAX_SAFE_INTEGER
          return aRank - bRank
        })
      : (data || [])

    return {
      products: sortedByRanking as GridProduct[],
      total: count || 0
    }
  } catch (error) {
    console.error('Shop page error:', error)
    return { products: [], total: 0 }
  }
}

async function getCategory(categorySlug?: string) {
  if (!categorySlug) return null

  try {
    const { data, error } = await supabaseServer
        .from('categories')
      .select('id, name, slug')
      .eq('slug', categorySlug)
      .single()

    if (error) return null
    return data
  } catch {
    return null
  }
}

async function getPriceRange() {
  try {
    const { data, error } = await supabaseServer
      .from('products')
      .select('base_price')
      .eq('is_active', true)
      .order('base_price', { ascending: true })
      .limit(1)
      .single()

    const { data: maxData, error: maxError } = await supabaseServer
      .from('products')
      .select('base_price')
      .eq('is_active', true)
      .order('base_price', { ascending: false })
      .limit(1)
      .single()

    if (error || maxError) {
      return { min: 0, max: 10000 }
    }

    return {
      min: Math.floor(data?.base_price || 0),
      max: Math.ceil(maxData?.base_price || 10000)
    }
  } catch {
    return { min: 0, max: 10000 }
  }
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams
  
  const [{ products, total }, category, priceRange] = await Promise.all([
    getProducts(params),
    getCategory(params.category),
    getPriceRange()
  ])

  const currentPage = Number(params.page) || 1
  const totalPages = Math.ceil(total / PRODUCTS_PER_PAGE)

  return (
    <ShopClientWrapper minPrice={priceRange.min} maxPrice={priceRange.max}>
      {/* Category Header */}
      <CategoryHeader
        categoryName={category?.name || 'All Products'}
        categorySlug={category?.slug}
        productCount={total}
        currentPage={currentPage}
        productsPerPage={PRODUCTS_PER_PAGE}
      />

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters (Desktop) */}
          <FiltersSidebar
            minPrice={priceRange.min}
            maxPrice={priceRange.max}
            className="hidden lg:block"
          />

          {/* Products Section */}
          <div className="flex-1 min-w-0">
            {/* Sort Bar (Desktop) */}
            <div className="hidden lg:block">
              <SortBar />
            </div>

            {/* Product Grid */}
            <div className="mt-6">
              <ProductGrid products={products} />
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalProducts={total}
            />
          </div>
        </div>
      </div>
    </ShopClientWrapper>
  )
}
