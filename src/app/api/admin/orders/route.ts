import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

/**
 * Admin API: Get Filtered Orders
 * 
 * Query params:
 * - payment_method: 'COD' | 'PREPAID'
 * - risk_tier: 'LOW' | 'MEDIUM' | 'HIGH'
 * - courier: string
 * - status: OrderStatus
 * - pincode: string
 * - date_from: ISO date string
 * - date_to: ISO date string
 * - page: number (default 1)
 * - limit: number (default 50)
 */
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url)
    
    // Extract filters
    const paymentMethod = searchParams.get('payment_method')
    const riskTier = searchParams.get('risk_tier')
    const courier = searchParams.get('courier')
    const status = searchParams.get('status')
    const pincode = searchParams.get('pincode')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod)
    }

    if (riskTier) {
      query = query.eq('razorpay_risk_tier', riskTier)
    }

    if (courier) {
      query = query.eq('courier', courier)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (pincode) {
      // Filter by shipping address pincode (JSONB query)
      query = query.filter('shipping_address->>pincode', 'eq', pincode)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('[ADMIN_ORDERS_API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      orders: orders || [],
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    })

  } catch (error) {
    console.error('[ADMIN_ORDERS_API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
