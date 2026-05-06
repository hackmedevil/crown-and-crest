/**
 * GET /api/products/ranking/category
 * 
 * Fetch ranked products for a specific category
 * Supports multiple sort options
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId')
    const categorySlug = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'ranking' // 'ranking', 'price_asc', 'price_desc', 'newest', 'rating'
    const minPrice = searchParams.get('minPrice')
      ? parseInt(searchParams.get('minPrice')!)
      : null
    const maxPrice = searchParams.get('maxPrice')
      ? parseInt(searchParams.get('maxPrice')!)
      : null
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '24'))
    const offset = parseInt(searchParams.get('offset') || '0')
    const page = Math.floor(offset / limit) + 1

    let finalCategoryId = categoryId

    // If category slug provided, resolve to ID
    if (categorySlug && !categoryId) {
      const { data: category, error: catError } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single()

      if (catError || !category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }

      finalCategoryId = category.id
    }

    if (!finalCategoryId) {
      return NextResponse.json(
        { error: 'Category ID or slug is required' },
        { status: 400 }
      )
    }

    // Validate sort option
    const validSortOptions = ['ranking', 'price_asc', 'price_desc', 'newest', 'rating']
    const validSort = validSortOptions.includes(sortBy) ? sortBy : 'ranking'

    // For ranking mode, use the advanced V3 engine
    const rankingMode = validSort === 'ranking'

    const rpcCall = rankingMode
      ? await supabase.rpc('get_category_ranked_products_v3', {
          p_category_id: finalCategoryId,
          p_limit: limit,
          p_offset: offset,
        })
      : await supabase.rpc(
          'get_ranked_products_by_category',
          {
            p_category_id: finalCategoryId,
            p_limit: limit,
            p_offset: offset,
            p_sort_by: validSort,
          },
          { count: 'exact' }
        )

    const results = rpcCall.data || []
    const error = rpcCall.error
    const count = 'count' in rpcCall ? (rpcCall as { count?: number | null }).count : null

    if (error) {
      console.error('Category ranking error:', error)
      return NextResponse.json(
        { error: 'Failed to load products', details: error.message },
        { status: 500 }
      )
    }

    // Apply price filters if specified
    let filteredResults = results || []
    if (minPrice !== null || maxPrice !== null) {
      filteredResults = filteredResults.filter((p: any) => {
        const price = p.base_price ?? p.basePrice ?? 0
        if (minPrice !== null && p.base_price < minPrice) return false
        if (maxPrice !== null && p.base_price > maxPrice) return false
        if (minPrice !== null && price < minPrice) return false
        if (maxPrice !== null && price > maxPrice) return false
        return true
      })
    }

    let productsMap = new Map<string, any>()
    if (rankingMode) {
      const ids = filteredResults.map((r: any) => r.product_id)
      if (ids.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, slug, base_price, average_rating, review_count, image_url')
          .in('id', ids)
          .eq('is_active', true)
        productsMap = new Map((products || []).map((p: any) => [p.id, p]))
      }
    }

    // Get category details
    const { data: categoryData } = await supabase
      .from('categories')
      .select('name, slug, description')
      .eq('id', finalCategoryId)
      .single()

    return NextResponse.json({
      category: categoryData,
      sortBy: validSort,
      results: filteredResults.map((product: any) => {
        const hydrated = rankingMode ? productsMap.get(product.product_id) : product
        return {
          id: product.product_id,
          name: hydrated?.name || product.name,
          slug: hydrated?.slug || product.slug,
          basePrice: hydrated?.base_price || product.base_price || 0,
          rating: hydrated?.average_rating || product.rating || 0,
          reviewCount: hydrated?.review_count || product.review_count || 0,
          imageUrl: hydrated?.image_url || product.image_url || null,
          rankingScore: product.final_score || product.ranking_score || product.global_score || 0,
        }
      }),
      pagination: {
        page,
        pageSize: limit,
        total: count || filteredResults.length,
        totalPages: Math.ceil((count || filteredResults.length) / limit),
      },
      filters: {
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
      },
    })
  } catch (error) {
    console.error('Category ranking endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
