import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/product-size-charts
 * Get size chart assignments for a product
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const params = req.nextUrl.searchParams
    const productId = params.get('product_id')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('product_size_charts')
      .select(`
        *,
        size_charts:size_chart_id(*)
      `)
      .eq('product_id', productId)

    if (error) throw error

    return NextResponse.json({ assignments: data || [] })
  } catch (error) {
    console.error('Error fetching product size charts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product size charts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/product-size-charts
 * Assign a size guide to a product
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { product_id, size_chart_id } = body

    if (!product_id || !size_chart_id) {
      return NextResponse.json(
        { error: 'Product ID and size chart ID are required' },
        { status: 400 }
      )
    }

    // Check if assignment already exists
    const { data: existing } = await supabaseServer
      .from('product_size_charts')
      .select('id')
      .eq('product_id', product_id)
      .eq('size_chart_id', size_chart_id)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'This size guide is already assigned to this product' },
        { status: 400 }
      )
    }

    // Create assignment
    const { data, error } = await supabaseServer
      .from('product_size_charts')
      .insert({ product_id, size_chart_id })
      .select()

    if (error) throw error

    return NextResponse.json({ assignment: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating product size chart:', error)
    return NextResponse.json(
      { error: 'Failed to assign size guide' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/product-size-charts?product_id={id}&size_chart_id={id}
 * Remove size guide assignment from product
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const productId = req.nextUrl.searchParams.get('product_id')
    const sizeChartId = req.nextUrl.searchParams.get('size_chart_id')

    if (!productId || !sizeChartId) {
      return NextResponse.json(
        { error: 'Product ID and size chart ID are required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer
      .from('product_size_charts')
      .delete()
      .eq('product_id', productId)
      .eq('size_chart_id', sizeChartId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product size chart:', error)
    return NextResponse.json(
      { error: 'Failed to remove size guide assignment' },
      { status: 500 }
    )
  }
}
