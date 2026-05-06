-- Production-Grade Stock Availability System
-- Creates reservation-aware availability functions

-- ============================================
-- FUNCTION 1: get_variant_availability
-- Returns per-variant stock with active reservations subtracted
-- ============================================

CREATE OR REPLACE FUNCTION get_variant_availability(variant_ids UUID[])
RETURNS TABLE (
  variant_id UUID,
  stock_quantity INTEGER,
  reserved_quantity INTEGER,
  available_to_sell INTEGER,
  is_out_of_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id AS variant_id,
    v.stock_quantity,
    COALESCE(SUM(sr.quantity) FILTER (
      WHERE sr.status = 'reserved' 
      AND sr.expires_at > NOW()
    ), 0)::INTEGER AS reserved_quantity,
    (v.stock_quantity - COALESCE(SUM(sr.quantity) FILTER (
      WHERE sr.status = 'reserved' 
      AND sr.expires_at > NOW()
    ), 0))::INTEGER AS available_to_sell,
    (v.stock_quantity - COALESCE(SUM(sr.quantity) FILTER (
      WHERE sr.status = 'reserved' 
      AND sr.expires_at > NOW()
    ), 0))::INTEGER <= 0 AS is_out_of_stock
  FROM variants v
  LEFT JOIN stock_reservations sr ON sr.variant_id = v.id
  WHERE v.id = ANY(variant_ids)
  GROUP BY v.id, v.stock_quantity;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION 2: get_product_stock_flags
-- Returns aggregated product-level stock status
-- ============================================

CREATE OR REPLACE FUNCTION get_product_stock_flags(product_ids UUID[])
RETURNS TABLE (
  product_id UUID,
  has_stock BOOLEAN,
  is_out_of_stock BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS product_id,
    -- Has stock if ANY variant has available_to_sell > 0
    BOOL_OR((v.stock_quantity - COALESCE(SUM(sr.quantity) FILTER (
      WHERE sr.status = 'reserved' 
      AND sr.expires_at > NOW()
    ), 0))::INTEGER > 0) AS has_stock,
    -- Out of stock if ALL variants have available_to_sell <= 0
    NOT BOOL_OR((v.stock_quantity - COALESCE(SUM(sr.quantity) FILTER (
      WHERE sr.status = 'reserved' 
      AND sr.expires_at > NOW()
    ), 0))::INTEGER > 0) AS is_out_of_stock
  FROM products p
  LEFT JOIN variants v ON v.product_id = p.id AND v.enabled = true
  LEFT JOIN stock_reservations sr ON sr.variant_id = v.id
  WHERE p.id = ANY(product_ids)
  GROUP BY p.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- These indexes already exist from 20251216004_stock_reservations_rpcs.sql,
-- but documenting here for reference:
-- CREATE INDEX IF NOT EXISTS idx_stock_reservations_variant ON stock_reservations(variant_id);
-- CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
-- CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at) WHERE status='reserved';
