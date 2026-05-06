-- ==============================================================
-- ANALYTICS PREREQUISITES FOR RANKING ENGINE
-- Date: 2026-03-08
-- Purpose: Create analytics tables required by ranking system
-- ==============================================================

-- ================================================================
-- PART 1: ANALYTICS EVENTS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event identification
  event_type TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  
  -- User context
  user_id UUID,
  session_id TEXT,
  
  -- Event metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_product_type 
  ON analytics_events(product_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type 
  ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id 
  ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id 
  ON analytics_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created 
  ON analytics_events(created_at DESC);

COMMENT ON TABLE analytics_events IS 'Track all ecommerce events: view_product, add_to_cart, purchase, search, etc.';

-- ================================================================
-- PART 2: PRODUCT ANALYTICS TABLE (AGGREGATED METRICS)
-- ================================================================

CREATE TABLE IF NOT EXISTS product_analytics (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  
  -- View metrics
  total_views INTEGER DEFAULT 0,
  views_7d INTEGER DEFAULT 0,
  views_30d INTEGER DEFAULT 0,
  
  -- Cart metrics
  add_to_cart_count INTEGER DEFAULT 0,
  
  -- Order metrics
  orders_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(12, 2) DEFAULT 0,
  
  -- Rating
  rating DECIMAL(3, 2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  
  -- Timestamps
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_analytics_views 
  ON product_analytics(total_views DESC);
CREATE INDEX IF NOT EXISTS idx_product_analytics_orders 
  ON product_analytics(orders_count DESC);

COMMENT ON TABLE product_analytics IS 'Aggregated metrics per product for fast ranking queries. Updated on each refresh cycle.';

-- ================================================================
-- PART 3: FUNCTION TO LOG ANALYTICS EVENTS
-- ================================================================

CREATE OR REPLACE FUNCTION log_analytics_event(
  p_event_type TEXT,
  p_product_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO analytics_events (
    event_type,
    product_id,
    user_id,
    session_id,
    metadata
  ) VALUES (
    p_event_type,
    p_product_id,
    p_user_id,
    p_session_id,
    p_metadata
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_analytics_event IS 'Log an analytics event from frontend or backend.';

-- ================================================================
-- PART 4: FUNCTION TO AGGREGATE ANALYTICS
-- ================================================================

CREATE OR REPLACE FUNCTION aggregate_product_analytics()
RETURNS TABLE(aggregated_count INT, last_updated TIMESTAMPTZ) AS $$
DECLARE
  v_count INT;
  v_timestamp TIMESTAMPTZ;
BEGIN
  v_timestamp := NOW();
  
  INSERT INTO product_analytics (
    product_id,
    total_views,
    views_7d,
    views_30d,
    add_to_cart_count,
    orders_count,
    last_updated
  )
  SELECT
    ae.product_id,
    COUNT(*) FILTER (WHERE ae.event_type = 'view_product') as total_views,
    COUNT(*) FILTER (WHERE ae.event_type = 'view_product' AND ae.created_at > NOW() - INTERVAL '7 days') as views_7d,
    COUNT(*) FILTER (WHERE ae.event_type = 'view_product' AND ae.created_at > NOW() - INTERVAL '30 days') as views_30d,
    COUNT(*) FILTER (WHERE ae.event_type = 'add_to_cart') as add_to_cart_count,
    COUNT(*) FILTER (WHERE ae.event_type = 'purchase') as orders_count,
    v_timestamp
  FROM analytics_events ae
  WHERE ae.product_id IS NOT NULL
  GROUP BY ae.product_id
  ON CONFLICT (product_id) DO UPDATE SET
    total_views = EXCLUDED.total_views,
    views_7d = EXCLUDED.views_7d,
    views_30d = EXCLUDED.views_30d,
    add_to_cart_count = EXCLUDED.add_to_cart_count,
    orders_count = EXCLUDED.orders_count,
    last_updated = EXCLUDED.last_updated;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_count, v_timestamp;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aggregate_product_analytics IS 'Aggregate analytics events into product_analytics table for performance.';

-- ================================================================
-- PART 5: INITIAL DATA
-- ================================================================

-- Insert sample analytics data if needed (you can comment this out)
-- INSERT INTO analytics_events (event_type, product_id, session_id, created_at)
-- SELECT 
--   'view_product',
--   p.id,
--   'session-' || gen_random_uuid()::text,
--   NOW() - INTERVAL '1 day' * (random() * 30)
-- FROM products p
-- LIMIT 100;

-- Run initial aggregation
SELECT aggregate_product_analytics();

-- ================================================================
-- END OF ANALYTICS PREREQUISITES
-- ================================================================
