import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') || 20)))
    const user = await getCurrentUser()

    if (!user) {
      // Graceful fallback for anonymous users: global ranking
      const { data: globalRows, error: globalError } = await supabaseServer.rpc('get_global_ranked_products_v3', {
        p_limit: limit,
        p_offset: 0,
      })

      if (globalError) {
        return NextResponse.json({ error: globalError.message }, { status: 500 })
      }

      return NextResponse.json({
        personalized: false,
        reason: 'anonymous_user_fallback_to_global',
        products: globalRows || [],
      })
    }

    const { data: rows, error } = await supabaseServer.rpc('get_personalized_recommendations_v3', {
      p_firebase_uid: user.uid,
      p_limit: limit,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const ids = (rows || []).map((r: { product_id: string }) => r.product_id)
    if (ids.length === 0) {
      return NextResponse.json({ personalized: true, products: [] })
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
      personalized: true,
      user_id: user.uid,
      products: (rows || []).map((r: any) => ({
        ...(byId.get(r.product_id) || { id: r.product_id }),
        user_interest_weight: r.user_interest_weight,
        global_score: r.global_score,
        personal_score: r.personal_score,
        hybrid_score: r.hybrid_score,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
