import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/color-palettes
 * Fetch all color palettes with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.toLowerCase() || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabaseServer
      .from('color_palettes')
      .select(`
        *,
        colors:colors(
          id,
          name,
          hex_code,
          display_order,
          is_active
        )
      `)

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Filter inactive unless explicitly requested
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    // Search by name
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Order by name
    query = query.order('name', { ascending: true })

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, palettes: data || [] })
  } catch (error) {
    console.error('Error fetching color palettes:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch color palettes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/color-palettes
 * Create a new color palette
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const { name, description, category, colors } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Palette name is required' },
        { status: 400 }
      )
    }

    // Create palette
    const { data: palette, error: paletteError } = await supabaseServer
      .from('color_palettes')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
      })
      .select()
      .single()

    if (paletteError) throw paletteError

    // Add colors if provided
    if (colors && Array.isArray(colors) && colors.length > 0) {
      const colorInserts = colors.map((color: any, index: number) => ({
        palette_id: palette.id,
        name: color.name,
        hex_code: color.hex_code,
        display_order: index,
      }))

      const { error: colorsError } = await supabaseServer
        .from('colors')
        .insert(colorInserts)

      if (colorsError) throw colorsError
    }

    // Fetch complete palette with colors
    const { data: completePalette, error: fetchError } = await supabaseServer
      .from('color_palettes')
      .select(`
        *,
        colors:colors(*)
      `)
      .eq('id', palette.id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json({ success: true, palette: completePalette })
  } catch (error) {
    console.error('Error creating color palette:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create color palette' },
      { status: 500 }
    )
  }
}
