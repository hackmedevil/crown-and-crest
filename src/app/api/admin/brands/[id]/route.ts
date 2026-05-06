import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/brands/[id]
 * Fetch a single brand
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params

    const { data, error } = await supabaseServer
      .from('brands')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, brand: data })
  } catch (error) {
    console.error('Error fetching brand:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brand' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/brands/[id]
 * Update a brand
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await req.json()
    const { name, code, description, logo_url, is_active } = body

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (code !== undefined) {
      // Validate code format
      if (!/^[A-Z0-9-]+$/.test(code)) {
        return NextResponse.json(
          { success: false, error: 'Code must contain only uppercase letters, numbers, and hyphens' },
          { status: 400 }
        )
      }
      updateData.code = code.toUpperCase()
    }
    if (description !== undefined) updateData.description = description
    if (logo_url !== undefined) updateData.logo_url = logo_url
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseServer
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Brand name or code already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, brand: data })
  } catch (error) {
    console.error('Error updating brand:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update brand' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/brands/[id]
 * Delete a brand
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params

    const { error } = await supabaseServer
      .from('brands')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete brand' },
      { status: 500 }
    )
  }
}
