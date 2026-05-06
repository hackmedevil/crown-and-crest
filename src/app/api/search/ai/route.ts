import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase/server'
import { executeSearch } from '@/lib/search/executor'
import { NormalizedIntent } from '@/lib/search/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SearchApiResult = {
  id: string
  title: string
  description: string | null
  category: string | null
  base_price: number
  image_url: string | null
  slug: string
  created_at: string | null
  in_stock: boolean
  score: number
}

async function getTrendingFallback(limit: number): Promise<SearchApiResult[]> {
  const { data: trending, error: trendingError } = await supabaseServer
    .from('search_trending_products')
    .select('id, name, description, category, base_price, image_url, slug, created_at, in_stock')
    .limit(limit)

  if (!trendingError && trending && trending.length > 0) {
    return trending.map((item) => ({
      id: item.id,
      title: item.name,
      description: item.description ?? null,
      category: item.category ?? null,
      base_price: item.base_price ?? 0,
      image_url: item.image_url ?? null,
      slug: item.slug ?? '',
      created_at: item.created_at ?? null,
      in_stock: item.in_stock ?? false,
      score: 0.4,
    }))
  }

  const { data: products } = await supabaseServer
    .from('products')
    .select('id, name, description, category, base_price, image_url, slug, created_at, search_metadata')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (products || []).map((product) => ({
    id: product.id,
    title: product.name,
    description: product.description ?? null,
    category: product.category ?? null,
    base_price: product.base_price ?? 0,
    image_url: product.image_url ?? null,
    slug: product.slug ?? '',
    created_at: product.created_at ?? null,
    in_stock: product.search_metadata?.has_stock || false,
    score: 0.0,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Parse optional filters
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const inStockOnly = searchParams.get('inStock') === 'true'
    const category = searchParams.get('category') || undefined
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')

    const priceRange = (minPrice || maxPrice) ? {
      min: minPrice ? parseFloat(minPrice) : undefined,
      max: maxPrice ? parseFloat(maxPrice) : undefined,
    } : undefined

    const intent: NormalizedIntent = {
      intent: {
        query_text: query.trim(),
        category: category || null,
        price_range: priceRange || undefined,
        in_stock: inStockOnly ? true : null,
      },
      confidence: {
        category: category ? 'strong' : 'optional',
        price_range: priceRange ? 'strong' : 'optional',
        in_stock: inStockOnly ? 'strong' : 'optional',
      },
    }

    const searchResult = await executeSearch(intent)
    const ids = searchResult.results.map(r => r.product_id)

    let products: any[] = []
    if (ids.length > 0) {
      const { data } = await supabaseServer
        .from('products')
        .select('id, name, description, category, base_price, image_url, slug, created_at, search_metadata, ai_title, ai_description')
        .in('id', ids)

      products = data || []
    }

    const productMap = new Map(products.map(p => [p.id, p]))
    const mergedResults: SearchApiResult[] = searchResult.results.map((item) => {
      const product = productMap.get(item.product_id)
      return {
        id: item.product_id,
        title: product?.ai_title || product?.name || '',
        description: product?.ai_description || product?.description || null,
        category: product?.category || null,
        base_price: product?.base_price || 0,
        image_url: product?.image_url || null,
        slug: product?.slug || '',
        created_at: product?.created_at ?? null,
        in_stock: product?.search_metadata?.has_stock || false,
        score: item.score,
      }
    })

    let results = mergedResults
    if (results.length === 0) {
      results = await getTrendingFallback(limit)
    }

    const total = results.length
    const start = (page - 1) * limit
    const end = start + limit
    const paged = results.slice(start, end)

    return NextResponse.json({
      query: query.trim(),
      results: paged,
      count: paged.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      applied_filters: searchResult.applied_filters,
      fallbacks_used: searchResult.fallbacks_used,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { 
        error: 'Search failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
