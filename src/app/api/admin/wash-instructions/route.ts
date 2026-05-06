import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseServer } from '@/lib/supabase/server'

const TABLE_CANDIDATES = ['wash_instructions', 'wash_instruction_profiles']

type WashInstructionRow = {
  id: string
  name: string
  summary: string | null
  details: unknown
  created_at?: string | null
  updated_at?: string | null
}

type NormalizedWashInstruction = {
  id: string
  name: string
  summary: string
  details: string
  created_at?: string | null
  updated_at?: string | null
}

function normalizeDetails(details: unknown): string {
  if (typeof details === 'string') return details

  if (Array.isArray(details)) {
    return details.map((line) => String(line).trim()).filter(Boolean).join('\n')
  }

  if (details && typeof details === 'object') {
    const asRecord = details as Record<string, unknown>
    if (Array.isArray(asRecord.lines)) {
      return asRecord.lines.map((line) => String(line).trim()).filter(Boolean).join('\n')
    }
  }

  return ''
}

function normalizeRow(row: WashInstructionRow): NormalizedWashInstruction {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary || '',
    details: normalizeDetails(row.details),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function tryTables<T>(run: (table: string) => Promise<{ data: T | null; error: unknown }>) {
  let lastError: unknown = null

  for (const table of TABLE_CANDIDATES) {
    const { data, error } = await run(table)
    if (!error) {
      return { data, table }
    }
    lastError = error
  }

  throw lastError || new Error('No wash instruction table found')
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')

    if (id) {
      const { data } = await tryTables<WashInstructionRow>(async (table) => {
        const response = await supabaseServer
          .from(table)
          .select('id, name, summary, details, created_at, updated_at')
          .eq('id', id)
          .single()
        return { data: response.data as WashInstructionRow | null, error: response.error }
      })

      if (!data) {
        return NextResponse.json({ error: 'Wash instruction not found' }, { status: 404 })
      }

      return NextResponse.json({ washInstruction: normalizeRow(data) })
    }

    const { data } = await tryTables<WashInstructionRow[]>(async (table) => {
      const response = await supabaseServer
        .from(table)
        .select('id, name, summary, details, created_at, updated_at')
        .order('created_at', { ascending: false })
      return { data: (response.data as WashInstructionRow[] | null) || [], error: response.error }
    })

    return NextResponse.json({ washInstructions: (data || []).map(normalizeRow) })
  } catch (error) {
    console.error('Error fetching wash instructions:', error)
    return NextResponse.json({ error: 'Failed to fetch wash instructions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
    const body = await req.json()

    const name = String(body.name || '').trim()
    const summary = String(body.summary || '').trim()
    const details = String(body.details || '').trim()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!details) {
      return NextResponse.json({ error: 'Details are required' }, { status: 400 })
    }

    const { data } = await tryTables<WashInstructionRow>(async (table) => {
      const response = await supabaseServer
        .from(table)
        .insert({ name, summary, details })
        .select('id, name, summary, details, created_at, updated_at')
        .single()
      return { data: response.data as WashInstructionRow | null, error: response.error }
    })

    return NextResponse.json({ washInstruction: data ? normalizeRow(data) : null }, { status: 201 })
  } catch (error) {
    console.error('Error creating wash instruction:', error)
    return NextResponse.json({ error: 'Failed to create wash instruction' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Wash instruction ID is required' }, { status: 400 })
    }

    const body = await req.json()

    const updateData: Record<string, string> = {}
    if (body.name !== undefined) updateData.name = String(body.name).trim()
    if (body.summary !== undefined) updateData.summary = String(body.summary).trim()
    if (body.details !== undefined) updateData.details = String(body.details).trim()

    const { data } = await tryTables<WashInstructionRow>(async (table) => {
      const response = await supabaseServer
        .from(table)
        .update(updateData)
        .eq('id', id)
        .select('id, name, summary, details, created_at, updated_at')
        .single()
      return { data: response.data as WashInstructionRow | null, error: response.error }
    })

    return NextResponse.json({ washInstruction: data ? normalizeRow(data) : null })
  } catch (error) {
    console.error('Error updating wash instruction:', error)
    return NextResponse.json({ error: 'Failed to update wash instruction' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Wash instruction ID is required' }, { status: 400 })
    }

    await tryTables<WashInstructionRow>(async (table) => {
      const response = await supabaseServer.from(table).delete().eq('id', id).select('id').single()
      return { data: response.data as WashInstructionRow | null, error: response.error }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wash instruction:', error)
    return NextResponse.json({ error: 'Failed to delete wash instruction' }, { status: 500 })
  }
}
