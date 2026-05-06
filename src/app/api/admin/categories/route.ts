import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/categories
 * Fetch all categories with optional search and filter
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search')?.toLowerCase() || ''
    const active = searchParams.get('active')
    const orderBy = searchParams.get('orderBy') || 'position'
    const parentOnly = searchParams.get('parent') === 'true'

    let query = supabaseServer
      .from('categories')
      .select('*')

    // Filter for parent categories only (where parent_id is null)
    if (parentOnly) {
      query = query.is('parent_id', null)
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }

    // Apply active filter
    if (active === 'true') {
      query = query.eq('is_active', true)
    } else if (active === 'false') {
      query = query.eq('is_active', false)
    }

    // Order by position or updated_at
    if (orderBy === 'position') {
      query = query.order('position', { ascending: true })
    } else if (orderBy === 'updated_at') {
      query = query.order('updated_at', { ascending: false })
    } else {
      query = query.order('name', { ascending: true })
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ categories: data || [] })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/categories
 * Create a new category
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { name, slug, description, image_url, meta_title, meta_description, parent_id } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Get max position to add new category at the end
    const { data: positionData } = await supabaseServer
      .from('categories')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = (positionData?.[0]?.position ?? -1) + 1

    const { data, error } = await supabaseServer
      .from('categories')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        description,
        image_url,
        meta_title,
        meta_description,
        parent_id: parent_id || null,
        position: nextPosition,
        is_active: true,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ category: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/categories?id={id}
 * Update a category
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { name, slug, description, image_url, meta_title, meta_description, is_active, position, parent_id } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug.toLowerCase().replace(/\s+/g, '-')
    if (description !== undefined) updateData.description = description
    if (image_url !== undefined) updateData.image_url = image_url
    if (meta_title !== undefined) updateData.meta_title = meta_title
    if (meta_description !== undefined) updateData.meta_description = meta_description
    if (is_active !== undefined) updateData.is_active = is_active
    if (position !== undefined) updateData.position = position
    if (parent_id !== undefined) updateData.parent_id = parent_id || null

    const { data, error } = await supabaseServer
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json({ category: data?.[0] })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/categories?id={id}
 * Delete a category
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
