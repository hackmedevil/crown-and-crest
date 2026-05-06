import { NextRequest, NextResponse } from 'next/server'
import { executeSearch } from '@/lib/search/executor'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { NormalizedIntent } from '@/lib/search/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''
    const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') || '8', 10), 20))

    if (query.length < 2) {
      return NextResponse.json({ results: [], count: 0 })
    }

    const intent: NormalizedIntent = {
      intent: {
        query_text: query,
        category: null,
        price_range: undefined,
        in_stock: null,
      },
      confidence: {
        category: 'optional',
        price_range: 'optional',
        in_stock: 'optional',
      },
    }

    const searchResult = await executeSearch(intent)
    const ids = searchResult.results.map((result) => result.product_id)

    if (ids.length === 0) {
      return NextResponse.json({ results: [], count: 0 })
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('id, name, category, base_price, image_url')
      .in('id', ids)
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const productMap = new Map((data || []).map((item) => [item.id, item]))
    const results = searchResult.results
      .map((item) => productMap.get(item.product_id))
      .filter(
        (product): product is { id: string; name: string; category: string | null; base_price: number; image_url: string | null } =>
          Boolean(product)
      )
      .slice(0, limit)
      .map((product) => ({
        id: product.id,
        title: product.name,
        category: product.category,
        base_price: product.base_price,
        image_url: product.image_url,
      }))

    return NextResponse.json({ results, count: results.length })
  } catch (error) {
    console.error('[ADMIN_SEARCH] Error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
