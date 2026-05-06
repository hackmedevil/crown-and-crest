import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus } from '@/types/order'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

/**
 * Admin API: Bulk Update Order Status
 * 
 * Body:
 * {
 *   order_ids: string[],
 *   new_status: OrderStatus
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Admin auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUids = process.env.ADMIN_UIDS?.split(',') || []
    if (!adminUids.includes(user.uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { order_ids, new_status } = await req.json()

    // Validate input
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return NextResponse.json(
        { error: 'order_ids must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!new_status) {
      return NextResponse.json(
        { error: 'new_status is required' },
        { status: 400 }
      )
    }

    console.log('[ADMIN_BULK_UPDATE] Updating', order_ids.length, 'orders to:', new_status)

    // Perform bulk update
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({
        status: new_status as OrderStatus,
        updated_at: new Date().toISOString(),
      })
      .in('id', order_ids)
      .select('id')

    if (error) {
      console.error('[ADMIN_BULK_UPDATE] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const count = data?.length || 0
    console.log('[ADMIN_BULK_UPDATE] Successfully updated', count, 'orders')

    // Revalidate all affected order pages
    for (const orderId of order_ids) {
      revalidatePath(`/admin/orders/${orderId}`)
    }
    // Also revalidate orders list
    revalidatePath('/admin/orders')

    return NextResponse.json({
      success: true,
      count,
    })

  } catch (error) {
    console.error('[ADMIN_BULK_UPDATE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
