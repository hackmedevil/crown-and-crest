import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'

function isMissingSchemaError(error: unknown): boolean {
  const code = typeof error === 'object' && error && 'code' in error
    ? String((error as { code?: string }).code)
    : ''

  return code === '42703' || code === 'PGRST202'
}

type NavCategory = {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  parent_id?: string | null
}

export async function GET() {
  try {
    const primary = await supabaseServer
      .from('categories')
      .select('id, name, slug, description, image_url, parent_id, position')
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('name', { ascending: true })

    let rows: NavCategory[] = []

    if (primary.error) {
      if (!isMissingSchemaError(primary.error)) {
        console.error('Navigation categories primary query error:', primary.error)
      }

      const fallback = await supabaseServer
        .from('categories')
        .select('id, name, slug, description, image_url, parent_id')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (fallback.error) {
        if (!isMissingSchemaError(fallback.error)) {
          console.error('Navigation categories fallback query error:', fallback.error)
        }
        return NextResponse.json({ categories: [] })
      }

      rows = (fallback.data || []) as NavCategory[]
    } else {
      rows = (primary.data || []) as NavCategory[]
    }

    const topLevel = rows.filter(row => !row.parent_id)
    const byParent = new Map<string, NavCategory[]>()

    for (const row of rows) {
      if (!row.parent_id) continue
      const list = byParent.get(row.parent_id) || []
      list.push(row)
      byParent.set(row.parent_id, list)
    }

    const categories = topLevel.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      image_url: category.image_url || undefined,
      subcategories: (byParent.get(category.id) || []).map(sub => ({
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description || undefined,
        image_url: sub.image_url || undefined,
      })),
    }))

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Navigation categories API error:', error)
    return NextResponse.json({ categories: [] })
  }
}
