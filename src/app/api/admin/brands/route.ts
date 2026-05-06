import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/brands
 * Fetch all brands
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const search = searchParams.get('search')?.toLowerCase() || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabaseServer
      .from('brands')
      .select('*')

    // Filter inactive unless explicitly requested
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Search by name or code
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    // Order by name
    query = query.order('name', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, brands: data || [] })
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/brands
 * Create a new brand
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { name, code, description, logo_url } = body

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and code are required' },
        { status: 400 }
      )
    }

    // Validate code format (uppercase, numbers, hyphens only)
    if (!/^[A-Z0-9-]+$/.test(code)) {
      return NextResponse.json(
        { success: false, error: 'Code must contain only uppercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('brands')
      .insert({
        name,
        code: code.toUpperCase(),
        description,
        logo_url,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {  // Unique constraint violation
        return NextResponse.json(
          { success: false, error: 'Brand name or code already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, brand: data }, { status: 201 })
  } catch (error) {
    console.error('Error creating brand:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create brand' },
      { status: 500 }
    )
  }
}
