import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/auth'

/**
 * Admin API: Export Orders to CSV
 * 
 * Same query params as GET /api/admin/orders
 * Returns CSV file stream
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
    
    // Extract filters (same as orders route)
    const paymentMethod = searchParams.get('payment_method')
    const riskTier = searchParams.get('risk_tier')
    const courier = searchParams.get('courier')
    const status = searchParams.get('status')
    const pincode = searchParams.get('pincode')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build query (no pagination for export)
    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (paymentMethod) query = query.eq('payment_method', paymentMethod)
    if (riskTier) query = query.eq('razorpay_risk_tier', riskTier)
    if (courier) query = query.eq('courier', courier)
    if (status) query = query.eq('status', status)
    if (pincode) query = query.filter('shipping_address->>pincode', 'eq', pincode)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data: orders, error } = await query

    if (error) {
      console.error('[ADMIN_EXPORT] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Generate CSV
    const csv = generateOrdersCsv(orders || [])

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })

  } catch (error) {
    console.error('[ADMIN_EXPORT] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Generate CSV from orders data
 */
interface OrderExport {
  id: string
  created_at: string
  status: string
  total_amount: number
  payment_method?: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  shipping_address?: Record<string, unknown>
  [key: string]: unknown
}

function generateOrdersCsv(orders: OrderExport[]): string {
  // CSV Headers
  const headers = [
    'Order ID',
    'Date',
    'Customer UID',
    'Customer Phone',
    'Payment Method',
    'COD Fee',
    'Amount',
    'Currency',
    'Risk Tier',
    'Status',
    'Courier',
    'Tracking ID',
    'Pincode',
    'Shipment Status',
    'Estimated Delivery',
    'Actual Delivery',
    'Razorpay Order ID',
    'Razorpay Payment ID',
  ]

  // Build CSV rows
  const rows = orders.map((order) => {
    const address = order.shipping_address
      ? (typeof order.shipping_address === 'string' 
          ? JSON.parse(order.shipping_address) 
          : order.shipping_address)
      : null

    return [
      order.id.slice(0, 12),
      new Date(order.created_at).toLocaleString(),
      String(order.firebase_uid || '').slice(0, 12),
      order.customer_phone || '',
      order.payment_method || (order.is_cod ? 'COD' : 'PREPAID'),
      String(order.cod_fee || '0'),
      String(order.amount || '0'),
      String(order.currency || 'INR'),
      String(order.razorpay_risk_tier || ''),
      order.status,
      String(order.courier || order.courier_name || ''),
      String(order.tracking_id || ''),
      String(address?.pincode || ''),
      String(order.shipment_status || ''),
      String(order.estimated_delivery_date || ''),
      String(order.actual_delivery_date || ''),
      String(order.razorpay_order_id || ''),
      String(order.razorpay_payment_id || ''),
    ].map(escapeCSV).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

/**
 * Escape CSV field
 */
function escapeCSV(field: unknown): string {
  const str = String(field)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
