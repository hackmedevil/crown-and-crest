import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/sku-search?sku=CC-JACKET-001
 * Search for products/variants by SKU
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const sku = searchParams.get('sku')

    if (!sku) {
      return NextResponse.json(
        { success: false, error: 'SKU parameter is required' },
        { status: 400 }
      )
    }

    // Search variants by SKU
    const { data: variants, error: variantsError } = await supabaseServer
      .from('variants')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          description,
          category,
          price,
          image_url,
          status,
          brand_id,
          brands (
            id,
            name,
            code
          )
        )
      `)
      .or(`sku.ilike.%${sku}%`)
      .order('created_at', { ascending: false })

    if (variantsError) throw variantsError

    // Also search products by SKU
    const { data: products, error: productsError } = await supabaseServer
      .from('products')
      .select(`
        id,
        name,
        sku,
        description,
        category,
        price,
        image_url,
        status,
        brand_id,
        brands (
          id,
          name,
          code
        )
      `)
      .ilike('sku', `%${sku}%`)
      .order('created_at', { ascending: false })

    if (productsError) throw productsError

    return NextResponse.json({
      success: true,
      variants: variants || [],
      products: products || [],
    })
  } catch (error) {
    console.error('Error searching SKU:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search SKU' },
      { status: 500 }
    )
  }
}
