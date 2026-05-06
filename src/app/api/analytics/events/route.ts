import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENTS = new Set([
  'product_view',
  'product_click',
  'add_to_cart',
  'wishlist_add',
  'purchase',
  'search_click',
  'scroll_depth',
  'time_on_product',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const eventType = String(body.event_type || '').trim()
    const productId = String(body.product_id || '').trim()
    const sessionId = String(body.session_id || req.headers.get('x-session-id') || '').trim()

    if (!ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json({ error: 'Unsupported event_type' }, { status: 400 })
    }

    if (!productId) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    const user = await getCurrentUser()

    const { data, error } = await supabaseAdmin.rpc('log_product_interaction_v3', {
      p_event_type: eventType,
      p_product_id: productId,
      p_user_id: user?.uid || null,
      p_session_id: sessionId || null,
      p_time_on_product_seconds:
        body.time_on_product_seconds !== undefined ? Number(body.time_on_product_seconds) : null,
      p_scroll_depth: body.scroll_depth !== undefined ? Number(body.scroll_depth) : null,
      p_metadata: typeof body.metadata === 'object' && body.metadata ? body.metadata : {},
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, event_id: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
