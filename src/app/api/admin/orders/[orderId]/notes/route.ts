import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

function appendJsonArray(existing: unknown, item: Record<string, unknown>) {
  const current = Array.isArray(existing) ? existing : []
  return [...current, item]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { orderId } = await params
    const body = await req.json().catch(() => ({}))
    const text = String(body.text || '').trim()

    if (!text) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('id, internal_notes, order_timeline')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const note = {
      id: crypto.randomUUID(),
      text,
      author_uid: user.uid,
      created_at: new Date().toISOString(),
    }

    const timelineEvent = {
      id: crypto.randomUUID(),
      event_type: 'INTERNAL_NOTE',
      actor_uid: user.uid,
      actor_type: 'ADMIN',
      created_at: new Date().toISOString(),
      metadata: {
        note_preview: text.slice(0, 120),
      },
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        internal_notes: appendJsonArray(order.internal_notes, note),
        order_timeline: appendJsonArray(order.order_timeline, timelineEvent),
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    revalidatePath(`/admin/orders/${orderId}`)

    return NextResponse.json({ success: true, note })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
