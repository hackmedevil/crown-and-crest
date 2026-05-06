/**
 * GET /api/products/[id]/ranking
 * 
 * Get detailed ranking information for a specific product
 * Shows breakdown of all ranking signals
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Validate product ID format
    if (!id || id.length === 0) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Get ranking details from RPC function
    const { data: rankings, error } = await supabase.rpc(
      'get_product_ranking_details',
      {
        p_product_id: id,
      }
    )

    if (error) {
      console.error('Ranking details error:', error)
      return NextResponse.json(
        { error: 'Failed to load ranking details', details: error.message },
        { status: 500 }
      )
    }

    if (!rankings || rankings.length === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const ranking = rankings[0]

    // Calculate additional metrics
    const avgConversionRate = 0.02 // placeholder, would come from aggregate query
    const isAboveAverage = ranking.conversion_rate > avgConversionRate

    return NextResponse.json({
      productId: ranking.product_id,
      productName: ranking.name,
      rankingScore: ranking.ranking_score,
      rankingPercentile: ranking.ranking_percentile,
      lastUpdated: ranking.updated_at,
      
      // Ranking signals breakdown
      signals: {
        purchases: {
          count: ranking.purchase_count,
          weight: 5,
          signal: ranking.purchase_count * 5,
          label: 'Sales Volume Signal',
          description: 'Score based on total purchases',
        },
        views: {
          count: ranking.view_count,
          weight: 2,
          signal: ranking.view_count * 2,
          label: 'View Popularity Signal',
          description: 'Score based on views in last 90 days',
        },
        addToCarts: {
          count: ranking.add_to_cart_count,
          weight: 1,
          signal: ranking.add_to_cart_count,
          label: 'Cart Interest Signal',
          description: 'Score based on add-to-cart events',
        },
        conversionRate: {
          rate: ranking.conversion_rate,
          weight: 10,
          signal: (ranking.conversion_rate as number) * 10,
          label: 'Conversion Rate Signal',
          description: 'Purchases divided by views',
          isAboveAverage,
        },
        rating: {
          score: ranking.rating_score,
          weight: 1.5,
          signal: ranking.rating_score * 1.5,
          label: 'Rating Signal',
          description: 'Product rating multiplied by review count',
        },
        recencyBoost: {
          boost: ranking.recency_boost,
          label: 'Recency Boost',
          description: 'Extra 10 points if product is less than 30 days old',
        },
        bestsellerBoost: {
          boost: ranking.bestseller_boost,
          label: 'Bestseller Boost',
          description: 'Extra points based on purchase volume',
        },
      },
      
      // Ranking interpretation
      performance: {
        percentile: ranking.ranking_percentile,
        interpretation:
          ranking.ranking_percentile >= 90
            ? 'Top 10% (Excellent)'
            : ranking.ranking_percentile >= 75
              ? 'Top 25% (Very Good)'
              : ranking.ranking_percentile >= 50
                ? 'Top 50% (Good)'
                : 'Below 50% (Needs Improvement)',
        recommendation:
          ranking.conversion_rate < 0.01
            ? 'Consider improving product quality or pricing'
            : ranking.view_count < 10
              ? 'Increase marketing and visibility'
              : 'Product is performing well',
      },
    })
  } catch (error) {
    console.error('Ranking details endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
