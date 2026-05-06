import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  // Use service role key for admin access
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const sql = `
CREATE OR REPLACE FUNCTION get_product_stock_flags(product_ids UUID[])
RETURNS TABLE (
  product_id UUID,
  has_stock BOOLEAN,
  is_out_of_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH variant_availability AS (
    -- First, calculate available_to_sell for each variant
    SELECT 
      v.id AS variant_id,
      v.product_id,
      (v.stock_quantity - COALESCE(SUM(sr.quantity) FILTER (
        WHERE sr.status = 'reserved' 
        AND sr.expires_at > NOW()
      ), 0))::INTEGER AS available_to_sell
    FROM variants v
    LEFT JOIN stock_reservations sr ON sr.variant_id = v.id
    WHERE v.product_id = ANY(product_ids)
      AND v.enabled = true
    GROUP BY v.id, v.product_id, v.stock_quantity
  )
  -- Now aggregate at product level
  SELECT 
    p.id AS product_id,
    -- Has stock if ANY variant has available_to_sell > 0
    COALESCE(BOOL_OR(va.available_to_sell > 0), false) AS has_stock,
    -- Out of stock if ALL variants have available_to_sell <= 0 (or no variants)
    NOT COALESCE(BOOL_OR(va.available_to_sell > 0), false) AS is_out_of_stock
  FROM products p
  LEFT JOIN variant_availability va ON va.product_id = p.id
  WHERE p.id = ANY(product_ids)
  GROUP BY p.id;
END;
$$ LANGUAGE plpgsql STABLE;
  `

  try {
    // Execute raw SQL using the REST API
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to execute SQL: ${response.status} - ${errorText}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration applied successfully - get_product_stock_flags function has been recreated without nested aggregates' 
    })
  } catch (err: unknown) {
    console.error('Migration error:', err)
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error',
      sql: sql 
    }, { status: 500 })
  }
}
