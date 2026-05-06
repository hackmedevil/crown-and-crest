import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/products/[id]/frequently-bought
 * 
 * Get products frequently bought together with current product
 * Returns bundle suggestions for upselling
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const limit = Math.min(4, parseInt(request.nextUrl.searchParams.get('limit') || '4'))

    // Prefer v3 hybrid (co-purchase + ranking + similarity). Fallback to legacy RPC.
    let data: any[] | null = null
    let error: { message?: string } | null = null

    const v3 = await supabase.rpc('get_frequently_bought_together_v3', {
      p_product_id: id,
      p_limit: limit,
    })

    if (!v3.error) {
      data = v3.data as any[]
    } else {
      const legacy = await supabase.rpc('get_frequently_bought_together', {
        p_product_id: id,
        p_limit: limit,
      })
      data = legacy.data as any[]
      error = legacy.error
    }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch frequently bought products', details: error.message },
        { status: 500 }
      )
    }

    const normalized = (data || []).map((row: any) => ({
      id: row.id || row.product_id,
      name: row.name,
      slug: row.slug,
      base_price: row.base_price,
      image_url: row.image_url,
      frequency: row.frequency || 0,
      recommendation_score: row.recommendation_score || null,
      recommended_variant_id: row.recommended_variant_id || null,
    }))

    return NextResponse.json({
      success: true,
      products: normalized,
    })
  } catch (error) {
    console.error('Frequently bought API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
