import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const revalidate = 300 // 5 minutes

function isMissingSchemaError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : ''

  return code === '42703' || code === 'PGRST202'
}

function logHomepageApiWarning(scope: string, error: unknown) {
  if (isMissingSchemaError(error)) {
    return
  }

  console.error(`${scope}:`, error)
}

/**
 * Unified Homepage Data API
 * 
 * Returns all homepage data in a single request:
 * - Categories (6 items)
 * - Trending products (8 items)
 * - Best sellers (8 items)
 * - New arrivals (8 items)
 * - Hero slides (3 items)
 * - Social proof metrics
 * 
 * Cached for 5 minutes for optimal performance
 */

export async function GET() {
  try {
    // 1. Categories (fallback if display_order is missing)
    const categoriesPrimary = await supabaseServer
      .from('categories')
      .select('id, name, slug, description, image_url, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(6)

    let categories: Record<string, unknown>[] = categoriesPrimary.data || []
    if (categoriesPrimary.error) {
      if (isMissingSchemaError(categoriesPrimary.error)) {
        const categoriesFallback = await supabaseServer
          .from('categories')
          .select('id, name, slug, description, image_url')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(6)

        if (categoriesFallback.error) {
          logHomepageApiWarning('Categories fallback error', categoriesFallback.error)
          categories = []
        } else {
          categories = categoriesFallback.data || []
        }
      } else {
        logHomepageApiWarning('Categories error', categoriesPrimary.error)
        categories = []
      }
    }

    // 2. Trending products (fallback if RPC is missing)
    const trendingPrimary = await supabaseServer.rpc('get_trending_products', { limit_count: 8 })

    let trending: Record<string, unknown>[] = trendingPrimary.data || []
    if (trendingPrimary.error) {
      if (isMissingSchemaError(trendingPrimary.error)) {
        const trendingFallback = await supabaseServer
          .from('products')
          .select('id, name, slug, base_price, mrp, discount_percentage, image_url, is_new, is_bestseller, rating, review_count, category_id, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(8)

        if (trendingFallback.error) {
          logHomepageApiWarning('Trending fallback error', trendingFallback.error)
          trending = []
        } else {
          trending = trendingFallback.data || []
        }
      } else {
        logHomepageApiWarning('Trending error', trendingPrimary.error)
        trending = []
      }
    }

    // 3. Best sellers (fallback if purchase_count is missing)
    const bestSellersPrimary = await supabaseServer
      .from('products')
      .select('id, name, slug, base_price, mrp, discount_percentage, image_url, is_new, is_bestseller, average_rating, review_count, category_id, purchase_count')
      .eq('is_active', true)
      .order('purchase_count', { ascending: false })
      .limit(8)

    let bestSellers: Record<string, unknown>[] = bestSellersPrimary.data || []
    if (bestSellersPrimary.error) {
      if (isMissingSchemaError(bestSellersPrimary.error)) {
        const bestSellersFallback = await supabaseServer
          .from('products')
          .select('id, name, slug, base_price, mrp, discount_percentage, image_url, is_new, is_bestseller, rating, review_count, category_id, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(8)

        if (bestSellersFallback.error) {
          logHomepageApiWarning('Best sellers fallback error', bestSellersFallback.error)
          bestSellers = []
        } else {
          bestSellers = bestSellersFallback.data || []
        }
      } else {
        logHomepageApiWarning('Best sellers error', bestSellersPrimary.error)
        bestSellers = []
      }
    }

    // 4. New arrivals
    const newArrivalsResult = await supabaseServer
      .from('products')
      .select('id, name, slug, base_price, mrp, discount_percentage, image_url, is_new, is_bestseller, average_rating, review_count, category_id, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8)

    const newArrivals: Record<string, unknown>[] = newArrivalsResult.error ? [] : (newArrivalsResult.data || [])
    if (newArrivalsResult.error) {
      logHomepageApiWarning('New arrivals error', newArrivalsResult.error)
    }

    // Hero slides (static for now, can be moved to database later)
    const heroSlides = [
      {
        id: 1,
        title: 'Summer Collection 2024',
        subtitle: 'Fresh styles for the season',
        image: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1920&h=1080&fit=crop',
        cta: {
          text: 'Shop Now',
          href: '/shop?collection=summer-2024'
        }
      },
      {
        id: 2,
        title: 'Up to 50% Off',
        subtitle: 'Limited time offer on selected items',
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&h=1080&fit=crop',
        cta: {
          text: 'View Sale',
          href: '/shop?sale=true'
        }
      },
      {
        id: 3,
        title: 'New Arrivals',
        subtitle: 'Be the first to wear the latest trends',
        image: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=1920&h=1080&fit=crop',
        cta: {
          text: 'Discover Now',
          href: '/shop?new=true'
        }
      }
    ]

    // Social proof metrics (can be fetched from database analytics later)
    const socialProof = {
      rating: 4.8,
      totalCustomers: 50000,
      totalReviews: 12500,
      qualityScore: 9.5
    }

    // Compile response
    const response = {
      success: true,
      data: {
        hero: heroSlides,
        categories,
        trending,
        bestSellers,
        newArrivals,
        socialProof
      },
      meta: {
        generatedAt: new Date().toISOString(),
        cacheLifetime: 300, // seconds
        version: '1.0'
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    })

  } catch (error) {
    console.error('Homepage API Error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch homepage data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
