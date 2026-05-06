import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * GET /api/products/[id]/similar
 * 
 * Get similar products in same category
 * Used for related products carousel at bottom of PDP
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '12')))

    const { data, error } = await supabaseServer.rpc('get_similar_products_v3', {
      p_product_id: id,
      p_limit: limit,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch similar products' },
        { status: 500 }
      )
    }

    const ids = (data || []).map((row: { product_id: string }) => row.product_id)
    if (ids.length === 0) {
      return NextResponse.json({ success: true, products: [] })
    }

    const { data: products, error: productsError } = await supabaseServer
      .from('products')
      .select('id, name, slug, base_price, mrp, image_url, category_id, is_active')
      .in('id', ids)

    if (productsError) {
      return NextResponse.json(
        { error: productsError.message || 'Failed to fetch similar products' },
        { status: 500 }
      )
    }

    const byId = new Map((products || []).map((p) => [p.id, p]))

    return NextResponse.json({
      success: true,
      products: (data || []).map((row: any) => ({
        ...(byId.get(row.product_id) || { id: row.product_id }),
        similarity: row.similarity,
        vector_similarity: row.vector_similarity,
        category_match: row.category_match,
        price_similarity: row.price_similarity,
      })),
    })
  } catch (error) {
    console.error('Similar products API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
