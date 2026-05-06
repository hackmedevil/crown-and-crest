import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type SortOption = 'ranking' | 'price_low_high' | 'price_high_low' | 'newest' | 'rating'

type ProductRow = {
  id: string
  name: string
  slug: string
  category_id: string | null
  brand: string | null
  base_price: number
  image_url: string | null
  created_at: string
  product_ranking_scores?: Array<{
    ranking_score: number | null
    purchase_count: number | null
    unique_user_views: number | null
  }>
  product_analytics?: Array<{
    rating: number | null
    review_count: number | null
  }>
}

const DEFAULT_LIMIT = 24
const MAX_LIMIT = 60
const FACET_SCAN_LIMIT = 5000

function parseMultiValue(searchParams: URLSearchParams, key: string): string[] {
  const raw = searchParams.get(key)
  if (!raw) return []
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function parseNumber(searchParams: URLSearchParams, key: string): number | undefined {
  const value = searchParams.get(key)
  if (!value) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeSort(value: string | null): SortOption {
  if (
    value === 'ranking' ||
    value === 'price_low_high' ||
    value === 'price_high_low' ||
    value === 'newest' ||
    value === 'rating'
  ) {
    return value
  }
  return 'ranking'
}

async function resolveVariantProductIds(sizes: string[], colors: string[]): Promise<string[] | null> {
  if (!sizes.length && !colors.length) return null

  let query = supabaseAdmin.from('variants').select('product_id')
  if (sizes.length) query = query.in('size', sizes)
  if (colors.length) query = query.in('color', colors)

  const { data, error } = await query
  if (error) throw error

  const productIds = [...new Set((data || []).map((row) => row.product_id).filter(Boolean))]
  return productIds
}

function buildProductQuery(params: {
  categoryId?: string
  search?: string
  brands: string[]
  minPrice?: number
  maxPrice?: number
  rating?: number
  variantProductIds: string[] | null
}) {
  let query = supabaseAdmin
    .from('products')
    .select(
      `
      id,
      name,
      slug,
      category_id,
      brand,
      base_price,
      image_url,
      created_at,
      product_ranking_scores(ranking_score, purchase_count, unique_user_views),
      product_analytics(rating, review_count)
      `,
      { count: 'exact' }
    )
    .eq('is_active', true)

  if (params.categoryId) query = query.eq('category_id', params.categoryId)
  if (params.brands.length) query = query.in('brand', params.brands)
  if (typeof params.minPrice === 'number') query = query.gte('base_price', params.minPrice)
  if (typeof params.maxPrice === 'number') query = query.lte('base_price', params.maxPrice)
  if (typeof params.rating === 'number') query = query.gte('product_analytics.rating', params.rating)

  if (params.search) {
    // Use ilike search as fallback when search_vector column doesn't exist
    query = query.or(`name.ilike.%${params.search}%,brand.ilike.%${params.search}%`)
  }

  if (params.variantProductIds) {
    if (!params.variantProductIds.length) {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
    } else {
      query = query.in('id', params.variantProductIds)
    }
  }

  return query
}

function applySort(query: any, sort: SortOption) {
  switch (sort) {
    case 'price_low_high':
      return query.order('base_price', { ascending: true }).order('created_at', { ascending: false })
    case 'price_high_low':
      return query.order('base_price', { ascending: false }).order('created_at', { ascending: false })
    case 'newest':
      return query.order('created_at', { ascending: false })
    case 'rating':
      return query
        .order('rating', { ascending: false, foreignTable: 'product_analytics' })
        .order('ranking_score', { ascending: false, foreignTable: 'product_ranking_scores' })
    case 'ranking':
    default:
      return query
        .order('ranking_score', { ascending: false, foreignTable: 'product_ranking_scores' })
        .order('created_at', { ascending: false })
  }
}

function mapProduct(row: ProductRow) {
  const ranking = row.product_ranking_scores?.[0]
  const analytics = row.product_analytics?.[0]

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category_id: row.category_id,
    brand: row.brand,
    base_price: row.base_price,
    image_url: row.image_url,
    created_at: row.created_at,
    ranking_score: ranking?.ranking_score ?? 0,
    purchase_count: ranking?.purchase_count ?? 0,
    unique_user_views: ranking?.unique_user_views ?? 0,
    rating: analytics?.rating ?? 0,
    review_count: analytics?.review_count ?? 0
  }
}

function buildCountMap(values: Array<string | null | undefined>) {
  const map = new Map<string, number>()
  for (const value of values) {
    if (!value) continue
    map.set(value, (map.get(value) || 0) + 1)
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams

    const category = sp.get('category') || undefined
    const search = sp.get('search')?.trim() || undefined
    const brands = parseMultiValue(sp, 'brand')
    const sizes = parseMultiValue(sp, 'size')
    const colors = parseMultiValue(sp, 'color')
    const minPrice = parseNumber(sp, 'min_price')
    const maxPrice = parseNumber(sp, 'max_price')
    const rating = parseNumber(sp, 'rating')
    const sort = normalizeSort(sp.get('sort'))
    const page = Math.max(1, Number(sp.get('page') || 1))
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(sp.get('limit') || DEFAULT_LIMIT)))
    
    let categoryId: string | undefined
    if (category) {
      const { data: categoryRow } = await supabaseAdmin
        .from('categories')
        .select('id')
        .or(`slug.eq.${category},id.eq.${category}`)
        .maybeSingle()

      categoryId = categoryRow?.id
      if (!categoryId) {
        return NextResponse.json({
          products: [],
          filters: { brands: [], sizes: [], colors: [], price_range: { min_price: 0, max_price: 0 } },
          pagination: { page, limit, total: 0, total_pages: 0 }
        })
      }
    }

    const variantProductIds = await resolveVariantProductIds(sizes, colors)

    // Calculate offset after we have all filter params
    const offset = (page - 1) * limit

    const mainQuery = applySort(
      buildProductQuery({
        categoryId,
        search,
        brands,
        minPrice,
        maxPrice,
        rating,
        variantProductIds
      }),
      sort
    )

    // First get the total count
    const { count } = await mainQuery.range(0, 0).limit(1)
    const total = count || 0

    // Return early if paginating beyond available data
    if (page > 1 && offset >= total && total > 0) {
      return NextResponse.json({
        products: [],
        filters: { brands: [], sizes: [], colors: [], price_range: { min_price: 0, max_price: 0 } },
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
      })
    }

    // Now query for the actual page of products
    const { data: productsRaw, error: productError } = await mainQuery.range(offset, Math.min(offset + limit - 1, total - 1))
    if (productError) throw productError
    
    const products = (productsRaw || []).map((row: unknown) => mapProduct(row as ProductRow))

    const facetQuery = buildProductQuery({
      categoryId,
      search,
      brands,
      minPrice,
      maxPrice,
      rating,
      variantProductIds
    }).select('id, brand, base_price')

    const { data: facetProductsRaw, error: facetError } = await facetQuery.range(0, FACET_SCAN_LIMIT - 1)
    if (facetError) throw facetError

    const facetProducts = (facetProductsRaw || []) as Array<{ id: string; brand: string | null; base_price: number }>
    const facetIds = facetProducts.map((p) => p.id)

    let sizesFacet: Array<{ value: string; count: number }> = []
    let colorsFacet: Array<{ value: string; count: number }> = []

    if (facetIds.length) {
      const { data: variantsData } = await supabaseAdmin
        .from('variants')
        .select('size, color, product_id')
        .in('product_id', facetIds)

      const sizeMap = new Map<string, Set<string>>()
      const colorMap = new Map<string, Set<string>>()

      for (const row of variantsData || []) {
        if (row.size) {
          if (!sizeMap.has(row.size)) sizeMap.set(row.size, new Set<string>())
          sizeMap.get(row.size)?.add(row.product_id)
        }
        if (row.color) {
          if (!colorMap.has(row.color)) colorMap.set(row.color, new Set<string>())
          colorMap.get(row.color)?.add(row.product_id)
        }
      }

      sizesFacet = [...sizeMap.entries()]
        .map(([value, ids]) => ({ value, count: ids.size }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    }

    const priceValues = facetProducts.map((p) => p.base_price)
    const minFacetPrice = priceValues.length ? Math.min(...priceValues) : 0
    const maxFacetPrice = priceValues.length ? Math.max(...priceValues) : 0

    return NextResponse.json({
      products,
      filters: {
        brands: buildCountMap(facetProducts.map((p) => p.brand)),
        sizes: sizesFacet,
        colors: colorsFacet,
        price_range: {
          min_price: minFacetPrice,
          max_price: maxFacetPrice
        }
      },
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch shop discovery data'
    console.error('[API][discovery/shop] error:', errorMessage, error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
