import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/colors
 * Fetch colors with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = req.nextUrl.searchParams
    const paletteId = searchParams.get('palette_id')
    const search = searchParams.get('search')?.toLowerCase() || ''
    const hexCode = searchParams.get('hex_code')

    let query = supabaseServer
      .from('colors')
      .select(`
        *,
        palette:color_palettes(id, name, category)
      `)

    // Filter by palette
    if (paletteId) {
      query = query.eq('palette_id', paletteId)
    }

    // Filter by hex code
    if (hexCode) {
      query = query.ilike('hex_code', `${hexCode}%`)
    }

    // Search by name
    if (search) {
      query = query.or(`name.ilike.%${search}%,hex_code.ilike.%${search}%`)
    }

    // Order by palette and display order
    query = query.order('palette_id').order('display_order')

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ success: true, colors: data || [] })
  } catch (error) {
    console.error('Error fetching colors:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch colors' },
      { status: 500 }
    )
  }
}
