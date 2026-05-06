import { NextRequest, NextResponse } from 'next/server'
import { getProductForPDP } from '@/lib/products/getProductForPDP'
import { supabaseServer } from '@/lib/supabase/server'
import type { GridProduct } from '@/types/grid'

export const dynamic = 'force-dynamic'

interface ReviewSummary {
  average: number
  total: number
}

async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  try {
    const { data, error } = await supabaseServer
      .from('product_reviews')
      .select('rating')
      .eq('product_id', productId)

    if (error || !data || data.length === 0) {
      return { average: 0, total: 0 }
    }

    const total = data.length
    const average = data.reduce((sum, item) => sum + (item.rating || 0), 0) / total

    return { average, total }
  } catch {
    return { average: 0, total: 0 }
  }
}

async function getRelatedProducts(productId: string, categoryId: string | null): Promise<GridProduct[]> {
  const similarRpc = await supabaseServer.rpc('get_similar_products_v3', {
    p_product_id: productId,
    p_limit: 8,
  })

  if (!similarRpc.error && (similarRpc.data || []).length > 0) {
    const ids: string[] = (similarRpc.data || []).map((row: { product_id: string }) => row.product_id)
    const { data: similarProducts } = await supabaseServer
      .from('products')
      .select('id, name, slug, base_price, mrp, image_url, is_active, rating, review_count, category')
      .in('id', ids)
      .eq('is_active', true)

    if (similarProducts && similarProducts.length > 0) {
      const byId = new Map(similarProducts.map((product) => [product.id, product]))
      return ids
        .map((id: string) => byId.get(id))
        .filter(Boolean) as GridProduct[]
    }
  }

  if (!categoryId) return []

  const { data } = await supabaseServer
    .from('products')
    .select('id, name, slug, base_price, mrp, image_url, is_active, rating, review_count, category')
    .eq('is_active', true)
    .eq('category_id', categoryId)
    .neq('id', productId)
    .limit(8)

  return (data || []) as GridProduct[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const pdpData = await getProductForPDP(slug)

    if (!pdpData) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 })
    }

    const [reviewSummary, relatedProducts] = await Promise.all([
      getReviewSummary(pdpData.product.id),
      getRelatedProducts(pdpData.product.id, pdpData.product.category?.id || null),
    ])

    return NextResponse.json(
      {
        success: true,
        data: {
          product: pdpData.product,
          variants: pdpData.variants,
          images: pdpData.images,
          pricing: pdpData.pricing,
          reviews: reviewSummary,
          relatedProducts,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Product by slug API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
