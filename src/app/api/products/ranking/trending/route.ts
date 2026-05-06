/**
 * GET /api/products/ranking/trending
 * 
 * Get trending products based on views in the last 24 hours
 * Optional category filter
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId')
    const categorySlug = searchParams.get('category')
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'))

    let finalCategoryId = categoryId

    // If category slug provided, resolve to ID
    if (categorySlug && !categoryId) {
      const { data: category, error: catError } = await supabaseServer
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

    const { data: baseResults, error } = await supabaseServer.rpc('get_trending_products_v3', {
      p_limit: limit * 3,
    })

    if (error) {
      console.error('Trending products error:', error)
      return NextResponse.json(
        { error: 'Failed to load trending products', details: error.message },
        { status: 500 }
      )
    }

    const ids = (baseResults || []).map((r: { product_id: string }) => r.product_id)
    const { data: products, error: productsError } = await supabaseServer
      .from('products')
      .select('id, name, slug, base_price, average_rating, image_url, category_id, is_active')
      .in('id', ids)
      .eq('is_active', true)

    if (productsError) {
      return NextResponse.json(
        { error: 'Failed to load trending products', details: productsError.message },
        { status: 500 }
      )
    }

    const byId = new Map((products || []).map((p) => [p.id, p]))
    const merged = (baseResults || [])
      .map((r: any) => ({
        trend: r,
        product: byId.get(r.product_id),
      }))
      .filter((x: { trend: any; product: any }) => x.product)
      .filter((x: { trend: any; product: any }) => !finalCategoryId || x.product?.category_id === finalCategoryId)
      .slice(0, limit)

    // Track this trending view for analytics
    try {
      await supabaseServer.from('analytics_events').insert({
        event_type: 'view_shop',
        session_id: request.headers.get('x-session-id'),
        user_agent: request.headers.get('user-agent'),
        metadata: { page: 'trending' },
      })
    } catch (e) {
      console.error('Trending analytics logging failed:', e)
    }

    return NextResponse.json({
      trending: true,
      timeframe: '24_hours',
      category: finalCategoryId ? { id: finalCategoryId } : null,
      products: merged.map((entry: any, index: number) => ({
        id: entry.product.id,
        name: entry.product.name,
        slug: entry.product.slug,
        basePrice: entry.product.base_price,
        rating: entry.product.average_rating || 0,
        imageUrl: entry.product.image_url,
        views24h: 0,
        trendingRank: index + 1,
        trendingScore: entry.trend.trending_score,
      })),
      total: merged.length,
    })
  } catch (error) {
    console.error('Trending endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
