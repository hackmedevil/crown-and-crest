import { supabaseServer } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/color-palettes/[id]
 * Fetch a single color palette with colors
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const { data, error } = await supabaseServer
      .from('color_palettes')
      .select(`
        *,
        colors:colors(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Palette not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, palette: data })
  } catch (error) {
    console.error('Error fetching color palette:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch color palette' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/color-palettes/[id]
 * Update a color palette
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()
    const { name, description, category, is_active, colors } = body

    // Update palette
    const { error: updateError } = await supabaseServer
      .from('color_palettes')
      .update({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(is_active !== undefined && { is_active }),
      })
      .eq('id', id)

    if (updateError) throw updateError

    // Update colors if provided
    if (colors && Array.isArray(colors)) {
      // Delete existing colors
      await supabaseServer.from('colors').delete().eq('palette_id', id)

      // Insert new colors
      if (colors.length > 0) {
        const colorInserts = colors.map((color: any, index: number) => ({
          palette_id: id,
          name: color.name,
          hex_code: color.hex_code,
          display_order: color.display_order ?? index,
          is_active: color.is_active ?? true,
        }))

        const { error: colorsError } = await supabaseServer
          .from('colors')
          .insert(colorInserts)

        if (colorsError) throw colorsError
      }
    }

    // Fetch updated palette
    const { data, error: fetchError } = await supabaseServer
      .from('color_palettes')
      .select(`
        *,
        colors:colors(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    return NextResponse.json({ success: true, palette: data })
  } catch (error) {
    console.error('Error updating color palette:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update color palette' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/color-palettes/[id]
 * Delete a color palette
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const { error } = await supabaseServer
      .from('color_palettes')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting color palette:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete color palette' },
      { status: 500 }
    )
  }
}
