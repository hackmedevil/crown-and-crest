/**
 * API route for paginated product loading
 * Supports cursor-based pagination for efficient data fetching
 */

import { supabaseServer } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cursor = searchParams.get('cursor')

  if (!cursor) {
    return Response.json(
      { error: 'Missing cursor parameter' },
      { status: 400 }
    )
  }

  const PRODUCTS_PER_PAGE = 12

  const { data: products, error } = await supabaseServer
    .from('products')
    .select('*')
    .eq('is_active', true)
    .lt('created_at', cursor)
    .order('created_at', { ascending: false })
    .limit(PRODUCTS_PER_PAGE + 1)

  if (error) {
    return Response.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }

  // Determine if there's a next page
  let nextCursor = null
  if (products && products.length > PRODUCTS_PER_PAGE) {
    nextCursor = products[PRODUCTS_PER_PAGE - 1]?.created_at || null
    products.pop()
  }

  return Response.json(
    {
      products: products ?? [],
      nextCursor,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    }
  )
}
