import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 24)))
    const offset = Math.max(0, Number(req.nextUrl.searchParams.get('offset') || 0))

    const { data: rows, error } = await supabaseServer.rpc('get_global_ranked_products_v3', {
      p_limit: limit,
      p_offset: offset,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ids = (rows || []).map((r: { product_id: string }) => r.product_id)
    if (ids.length === 0) {
      return NextResponse.json({ products: [], total: 0 })
    }

    const { data: products, error: productsError } = await supabaseServer
      .from('products')
      .select('id, name, slug, base_price, mrp, image_url, category_id, is_active')
      .in('id', ids)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const byId = new Map((products || []).map((p) => [p.id, p]))

    return NextResponse.json({
      products: (rows || []).map((r: any) => ({
        ...(byId.get(r.product_id) || { id: r.product_id }),
        global_score: r.global_score,
        final_score: r.final_score,
        engagement_normalized: r.engagement_normalized,
        sales_velocity_decay: r.sales_velocity_decay,
        conversion_score: r.conversion_score,
        rating_score: r.rating_score,
        freshness_score: r.freshness_score,
      })),
      total: rows?.length || 0,
      limit,
      offset,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
