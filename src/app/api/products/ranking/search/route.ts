/**
 * GET /api/products/ranking/search
 * 
 * Full-text search with ranking algorithm
 * Combines search relevance with product ranking scores
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()
    const categoryId = searchParams.get('category')
    const minPrice = searchParams.get('minPrice')
      ? parseInt(searchParams.get('minPrice')!)
      : null
    const maxPrice = searchParams.get('maxPrice')
      ? parseInt(searchParams.get('maxPrice')!)
      : null
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '24'))
    const offset = parseInt(searchParams.get('offset') || '0')
    const page = Math.floor(offset / limit) + 1

    // Validate search query
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Call the RPC function for ranked search results
    const { data: results, error, count } = await supabase.rpc(
      'search_products_with_ranking',
      {
        p_query: query,
        p_category_id: categoryId || null,
        p_limit: limit,
        p_offset: offset,
      },
      { count: 'exact' }
    )

    if (error) {
      console.error('Search ranking error:', error)
      return NextResponse.json(
        { error: 'Search failed', details: error.message },
        { status: 500 }
      )
    }

    // Log the search for analytics
    try {
      await supabase.from('search_analytics').insert({
        query,
        results_count: count || 0,
        session_id: request.headers.get('x-session-id'),
      })
    } catch (e) {
      // Non-blocking: analytics logging failure shouldn't break search
      console.error('Search analytics logging failed:', e)
    }

    return NextResponse.json({
      query,
      results: (results || []).map((product: any) => ({
        id: product.product_id,
        name: product.name,
        slug: product.slug,
        basePrice: product.base_price,
        rating: product.rating,
        reviewCount: product.review_count,
        imageUrl: product.image_url,
        rankingScore: product.ranking_score,
        searchRank: product.search_rank,
      })),
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      facets: {
        query,
        resultCount: count || 0,
      },
    })
  } catch (error) {
    console.error('Search ranking endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
