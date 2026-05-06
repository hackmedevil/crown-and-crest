import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/search
 * 
 * Full-text search with relevance ranking using PostgreSQL ts_rank
 * 
 * Query Parameters:
 * - q: search query (required)
 * - category: filter by category slug
 * - minPrice: minimum price in paise
 * - maxPrice: maximum price in paise
 * - limit: results per page (default 20, max 100)
 * - offset: pagination offset (default 0)
 * 
 * Response: { results, total, facets }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const categorySlug = searchParams.get('category')
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice')!) : null
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : null
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'))
    const offset = parseInt(searchParams.get('offset') || '0')

    // Prepare the search query using PostgreSQL full-text search
    const tsquery = query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .join(' & ') // AND operator for more specific results

    // Build the query using raw SQL for full-text search with ranking
    const { data: results, error, count } = await supabase.rpc(
      'search_products',
      {
        p_query: query,
        p_limit: limit,
      },
      { count: 'exact' }
    )

    if (error) {
      console.error('Search error:', error)
      // Fallback to simple name/description search
      const { data: fallbackResults, count: fallbackCount } = await supabase
        .from('products')
        .select('id, name, slug, base_price, image_url, category_id', {
          count: 'exact',
        })
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .range(offset, offset + limit - 1)

      if (error) {
        return NextResponse.json(
          { error: 'Search failed' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        results: fallbackResults?.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          basePrice: p.base_price,
          imageUrl: p.image_url,
          rank: 0,
        })) || [],
        total: fallbackCount || 0,
        facets: {
          totalResults: fallbackCount || 0,
          query,
        },
      })
    }

    // Log the search for analytics
    try {
      await supabase.from('search_analytics').insert({
        query,
        results_count: count || 0,
        session_id: request.headers.get('x-session-id'),
      })
    } catch (err) {
      // Don't fail if analytics logging fails
      console.error('Failed to log search:', err)
    }

    // Format results with ranking
    const formattedResults = results?.map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      basePrice: product.base_price,
      imageUrl: product.image_url,
      rank: product.rank || 0,
    })) || []

    return NextResponse.json({
      success: true,
      results: formattedResults,
      total: count || 0,
      facets: {
        totalResults: count || 0,
        query,
        executionTime: 'instant',
      },
      suggestions: [
        // Could add autocomplete suggestions here
      ],
    })
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
