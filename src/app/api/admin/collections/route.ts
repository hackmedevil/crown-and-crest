import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PROTECTED_COLLECTION_SLUGS = new Set(['new-arrivals', 'new-arrival'])

async function getCollectionById(id: string) {
  const { data, error } = await supabaseServer
    .from('collections')
    .select('id, slug, name')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * GET /api/admin/collections
 * Fetch all collections with optional search and filter
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search')?.toLowerCase() || ''
    const active = searchParams.get('active')
    const orderBy = searchParams.get('orderBy') || 'updated_at'

    let query = supabaseServer
      .from('collections')
      .select(`
        id,
        name,
        slug,
        description,
        is_active,
        created_at,
        updated_at,
        collection_items(count)
      `)

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

    // Order
    if (orderBy === 'updated_at') {
      query = query.order('updated_at', { ascending: false })
    } else if (orderBy === 'name') {
      query = query.order('name', { ascending: true })
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ collections: data || [] })
  } catch (error) {
    console.error('Error fetching collections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/collections
 * Create a new collection
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { name, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')

    const { data, error } = await supabaseServer
      .from('collections')
      .insert({
        name,
        slug,
        description,
        is_active: true,
      })
      .select()

    if (error) throw error

    return NextResponse.json({ collection: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/collections?id={id}
 * Update a collection
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      )
    }

    const existingCollection = await getCollectionById(id)
    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    if (PROTECTED_COLLECTION_SLUGS.has(existingCollection.slug)) {
      const bodyForLockCheck = await req.json()
      const isAttemptingCriticalChange =
        bodyForLockCheck.name !== undefined ||
        bodyForLockCheck.slug !== undefined ||
        bodyForLockCheck.is_active !== undefined

      if (isAttemptingCriticalChange) {
        return NextResponse.json(
          { error: 'New Arrivals is a protected system collection and cannot be renamed, disabled, or re-slugged.' },
          { status: 403 }
        )
      }

      const updateData = {
        description: bodyForLockCheck.description,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabaseServer
        .from('collections')
        .update(updateData)
        .eq('id', id)
        .select()

      if (error) throw error
      return NextResponse.json({ collection: data?.[0] })
    }

    const body = await req.json()
    const { name, slug, description, is_active } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug.toLowerCase().replace(/\s+/g, '-')
    if (description !== undefined) updateData.description = description
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseServer
      .from('collections')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) throw error

    return NextResponse.json({ collection: data?.[0] })
  } catch (error) {
    console.error('Error updating collection:', error)
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/collections?id={id}
 * Delete a collection
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Collection ID is required' },
        { status: 400 }
      )
    }

    const existingCollection = await getCollectionById(id)
    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    if (PROTECTED_COLLECTION_SLUGS.has(existingCollection.slug)) {
      return NextResponse.json(
        { error: 'New Arrivals is a protected system collection and cannot be deleted.' },
        { status: 403 }
      )
    }

    const { error } = await supabaseServer
      .from('collections')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting collection:', error)
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}
