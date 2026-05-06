import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/size-guides
 * Fetch all size guides with optional filtering by category
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.toLowerCase() || ''

    let query = supabaseServer
      .from('size_charts')
      .select('*')

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Order by category and name
    query = query.order('category', { ascending: true }).order('name', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    // Transform measurements object to sizes array
    const transformedData = (data || []).map((guide: any) => ({
      ...guide,
      sizes: guide.measurements
        ? Object.entries(guide.measurements).map(([size, measurements]: [string, any]) => ({
            size,
            measurements,
          }))
        : [],
    }))

    return NextResponse.json({ success: true, sizeGuides: transformedData })
  } catch (error) {
    console.error('Error fetching size guides:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch size guides' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/size-guides
 * Create a new size guide
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { name, category, sizes, fit_type, measurement_unit } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    if (!sizes || sizes.length === 0) {
      return NextResponse.json(
        { error: 'At least one size is required' },
        { status: 400 }
      )
    }

    // Convert sizes array to measurements object
    const measurements = sizes.reduce((acc: Record<string, any>, size: any) => {
      acc[size.size] = size.measurements
      return acc
    }, {})

    const { data, error } = await supabaseServer
      .from('size_charts')
      .insert({
        name,
        category,
        measurements,
        fit_type: fit_type || 'standard',
        measurement_unit: measurement_unit || 'cm',
      })
      .select()

    if (error) throw error

    // Transform measurements object to sizes array
    const result = data?.[0]
    if (result) {
      result.sizes = result.measurements
        ? Object.entries(result.measurements).map(([size, measurements]: [string, any]) => ({
            size,
            measurements,
          }))
        : []
    }

    return NextResponse.json({ sizeGuide: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating size guide:', error)
    return NextResponse.json(
      { error: 'Failed to create size guide' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/size-guides?id={id}
 * Update a size guide
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Size guide ID is required' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { name, category, sizes, fit_type, measurement_unit } = body

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (fit_type !== undefined) updateData.fit_type = fit_type
    if (measurement_unit !== undefined) updateData.measurement_unit = measurement_unit
    
    // Convert sizes array to nested measurements object
    if (sizes !== undefined) {
      const measurementsObj: Record<string, Record<string, number>> = {}
      for (const size of sizes) {
        if (size.size && size.measurements) {
          measurementsObj[size.size] = size.measurements
        }
      }
      updateData.measurements = measurementsObj
    }

    const { data, error } = await supabaseServer
      .from('size_charts')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) throw error

    // Transform measurements object to sizes array
    const result = data?.[0]
    if (result) {
      result.sizes = result.measurements
        ? Object.entries(result.measurements).map(([size, measurements]: [string, any]) => ({
            size,
            measurements,
          }))
        : []
    }

    return NextResponse.json({ sizeGuide: result })
  } catch (error) {
    console.error('Error updating size guide:', error)
    return NextResponse.json(
      { error: 'Failed to update size guide' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/size-guides?id={id}
 * Delete a size guide
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Size guide ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer
      .from('size_charts')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting size guide:', error)
    return NextResponse.json(
      { error: 'Failed to delete size guide' },
      { status: 500 }
    )
  }
}
