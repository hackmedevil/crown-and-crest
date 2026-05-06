/**
 * POST /api/admin/ranking/refresh
 * 
 * Admin endpoint to manually refresh product ranking scores
 * Should be protected and called periodically (e.g., every 30 minutes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Simple API key authentication for cron jobs
const RANKING_REFRESH_KEY = process.env.RANKING_REFRESH_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!RANKING_REFRESH_KEY || apiKey !== RANKING_REFRESH_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const startTime = Date.now()

    // Step 1: Try unified V3 refresh first
    console.log('Refreshing multi-layer ranking v3...')
    let refreshResult: any[] | null = null
    let refreshError: { message?: string } | null = null

    const v3Result = await supabase.rpc('refresh_multilayer_ranking_v3')
    if (!v3Result.error) {
      refreshResult = v3Result.data as any[]
    } else {
      // Step 2 (fallback): legacy refresh path
      console.log('V3 refresh unavailable, falling back to legacy refresh_product_ranking_scores...')
      const legacy = await supabase.rpc('refresh_product_ranking_scores')
      refreshResult = legacy.data as any[]
      refreshError = legacy.error
    }

    if (refreshError) {
      console.error('Refresh error:', refreshError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to refresh rankings',
          details: refreshError.message,
        },
        { status: 500 }
      )
    }

    const refreshDuration = Date.now() - startTime

    // Step 3: Backfill any active products that still have no ranking score
    // (products created before the trigger migration, or created between refreshes)
    let backfilledCount = 0
    try {
      // Get product IDs that already have a ranking score
      const { data: scoredRows } = await supabase
        .from('product_ranking_scores')
        .select('product_id')

      const scoredIds = new Set((scoredRows || []).map((r: { product_id: string }) => r.product_id))

      // Get all active products
      const { data: activeProducts } = await supabase
        .from('products')
        .select('id, created_at')
        .eq('is_active', true)

      const unrankedProducts = (activeProducts || []).filter(
        (p: { id: string; created_at: string }) => !scoredIds.has(p.id)
      )

      if (unrankedProducts.length > 0) {
        const now = new Date().toISOString()
        const rows = unrankedProducts.map((p: { id: string; created_at: string }) => {
          const daysOld = Math.max(
            Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86_400_000),
            0
          )
          const recencyBoost = Math.round((30 / (daysOld + 1)) * 100) / 100
          return {
            product_id: p.id,
            purchase_count: 0,
            view_count: 0,
            add_to_cart_count: 0,
            unique_user_views: 0,
            unique_session_views: 0,
            conversion_rate: 0,
            rating_score: 0,
            stock_score: 1,
            cart_score: 0,
            recency_decay_boost: recencyBoost,
            bestseller_boost: 0,
            ranking_score: recencyBoost + 1,
            last_updated: now,
            updated_at: now,
          }
        })
        await supabase
          .from('product_ranking_scores')
          .upsert(rows as never[], { onConflict: 'product_id', ignoreDuplicates: true })
        backfilledCount = rows.length
        console.log(`Backfilled ${backfilledCount} products with no ranking score`)
      }
    } catch (backfillErr) {
      console.error('Ranking backfill error (non-fatal):', backfillErr)
    }

    // Log the refresh operation
    try {
      await supabase.from('ranking_refresh_logs').insert({
        triggered_by: 'api',
        refreshed_count:
          refreshResult?.[0]?.refreshed_products ||
          refreshResult?.[0]?.refreshed_count ||
          0,
        duration_ms: refreshDuration,
        status: 'success',
        last_updated: new Date(),
      })
    } catch (e) {
      console.error('Failed to log refresh:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Product rankings refreshed successfully',
      stats: {
        productsUpdated:
          refreshResult?.[0]?.refreshed_products ||
          refreshResult?.[0]?.refreshed_count ||
          0,
        productsBackfilled: backfilledCount,
        userVectorsUpdated: refreshResult?.[0]?.refreshed_user_vectors || 0,
        featureVectorsUpdated: refreshResult?.[0]?.refreshed_feature_vectors || 0,
        durationMs: refreshDuration,
        durationSeconds: (refreshDuration / 1000).toFixed(2),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Ranking refresh endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for status check
export async function GET(request: NextRequest) {
  try {
    // Get the last refresh timestamp
    const { data: lastRefresh, error } = await supabase
      .from('product_ranking_scores')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const minutesSinceRefresh = lastRefresh
      ? Math.floor(
          (Date.now() - new Date(lastRefresh.updated_at).getTime()) / 60000
        )
      : null

    return NextResponse.json({
      status: 'ok',
      lastRefresh: lastRefresh?.updated_at,
      minutesSinceRefresh,
      needsRefresh: minutesSinceRefresh ? minutesSinceRefresh > 30 : true,
    })
  } catch (error) {
    console.error('Ranking status check error:', error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to check ranking status' },
      { status: 500 }
    )
  }
}
