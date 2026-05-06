-- ==============================================================
-- RANKING ENGINE SUPPORT TABLES
-- Date: 2026-03-08
-- Purpose: Support tables for ranking refresh logging and configuration
-- ==============================================================

-- ================================================================
-- PART 1: RANKING REFRESH LOGS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS ranking_refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL DEFAULT 'cron', -- 'cron', 'api', 'manual'
  refreshed_count INT DEFAULT 0,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failure'
  error_message TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ranking_refresh_logs_created ON ranking_refresh_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_refresh_logs_status ON ranking_refresh_logs(status);
CREATE INDEX IF NOT EXISTS idx_ranking_refresh_logs_triggered ON ranking_refresh_logs(triggered_by);

-- ================================================================
-- PART 2: RANKING CONFIG TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS ranking_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO ranking_config (config_key, config_value, description) VALUES
  ('signal_weights', jsonb_build_object(
    'purchase_weight', 5,
    'view_weight', 2,
    'cart_weight', 3,
    'conversion_weight', 10,
    'rating_weight', 1.5,
    'stock_penalty', -100,
    'stock_neutral', 1,
    'bestseller_boost_thresholds', jsonb_build_object(
      '100', 20,
      '50', 15,
      '25', 10,
      '10', 5
    ),
    'notes', 'V2: Added cart signal (3x), stock penalty (-100 if out of stock), unique user views (anti-manipulation), freshness decay formula'
  ), 'Signal weights and boosts for ranking calculation (V2 - with enhancements)')
ON CONFLICT (config_key) DO UPDATE SET updated_at = NOW();

INSERT INTO ranking_config (config_key, config_value, description) VALUES
  ('ranking_refresh_interval', jsonb_build_object(
    'minutes', 30,
    'timezone', 'UTC'
  ), 'How often to refresh ranking scores (in minutes)')
ON CONFLICT (config_key) DO UPDATE SET updated_at = NOW();

INSERT INTO ranking_config (config_key, config_value, description) VALUES
  ('trending_timeframe', jsonb_build_object(
    'hours', 24,
    'description', 'Views in last 24 hours'
  ), 'Timeframe for trending products calculation')
ON CONFLICT (config_key) DO UPDATE SET updated_at = NOW();

INSERT INTO ranking_config (config_key, config_value, description) VALUES
  ('analytics_retention', jsonb_build_object(
    'days', 90,
    'description', 'Keep analytics events for 90 days'
  ), 'How long to retain analytics data')
ON CONFLICT (config_key) DO UPDATE SET updated_at = NOW();

INSERT INTO ranking_config (config_key, config_value, description) VALUES
  ('anti_manipulation_rules', jsonb_build_object(
    'use_unique_users', true,
    'use_unique_sessions', true,
    'view_time_decay', jsonb_build_object(
      'recent_weight', 3,
      'recent_days', 7,
      'older_weight', 1
    ),
    'description', 'Use unique user/session counts instead of raw events to prevent bot manipulation'
  ), 'Anti-manipulation settings for ranking')
ON CONFLICT (config_key) DO UPDATE SET updated_at = NOW();

-- ================================================================
-- PART 3: CATEGORY-SPECIFIC RANKING WEIGHTS (Future customization)
-- ================================================================

CREATE TABLE IF NOT EXISTS category_ranking_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE UNIQUE,
  
  -- Signal weights (override global defaults)
  purchase_weight DECIMAL(5, 2) DEFAULT 5,
  view_weight DECIMAL(5, 2) DEFAULT 2,
  cart_weight DECIMAL(5, 2) DEFAULT 3,
  conversion_weight DECIMAL(5, 2) DEFAULT 10,
  rating_weight DECIMAL(5, 2) DEFAULT 1.5,
  stock_penalty DECIMAL(8, 2) DEFAULT -100,
  
  -- Boost customization
  recency_decay_enabled BOOLEAN DEFAULT true,
  bestseller_boost_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_category_ranking_weights_category ON category_ranking_weights(category_id);

INSERT INTO category_ranking_weights (category_id, rating_weight, conversion_weight, description)
SELECT id, 2.0, 8.0, 'Electronics: Rating matters more'
FROM categories 
WHERE slug IN ('electronics', 'appliances', 'gadgets')
  AND id NOT IN (SELECT category_id FROM category_ranking_weights)
LIMIT 1;

INSERT INTO category_ranking_weights (category_id, view_weight, purchase_weight, description)
SELECT id, 3.0, 4.0, 'Fashion: Trending/views matter more than same conversion rate'
FROM categories 
WHERE slug IN ('fashion', 'clothing', 'apparel')
  AND id NOT IN (SELECT category_id FROM category_ranking_weights)
LIMIT 1;

-- ================================================================
-- PART 4: PRODUCT RANKING HISTORY (OPTIONAL - for tracking changes)
-- ================================================================

CREATE TABLE IF NOT EXISTS product_ranking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ranking_score DECIMAL(12, 2),
  ranking_position INT,
  percentile DECIMAL(5, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT recording_interval CHECK (
    -- Prevent duplicate recordings within same minute
    true
  )
);

CREATE INDEX IF NOT EXISTS idx_product_ranking_history_product ON product_ranking_history(product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_ranking_history_recorded ON product_ranking_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_ranking_history_percentile ON product_ranking_history(percentile DESC);

-- ================================================================
-- PART 4: FUNCTION TO GET RANKING STATISTICS
-- ================================================================

CREATE OR REPLACE FUNCTION get_ranking_statistics()
RETURNS TABLE(
  total_products INT,
  avg_ranking_score DECIMAL,
  max_ranking_score DECIMAL,
  min_ranking_score DECIMAL,
  products_with_sales INT,
  products_with_views INT,
  avg_conversion_rate DECIMAL,
  last_refresh TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT,
    ROUND(AVG(ranking_score)::NUMERIC, 2),
    MAX(ranking_score),
    MIN(ranking_score),
    COUNT(*) FILTER (WHERE purchase_count > 0)::INT,
    COUNT(*) FILTER (WHERE view_count > 0)::INT,
    ROUND(AVG(CAST(conversion_rate AS NUMERIC)), 4),
    MAX(updated_at)
  FROM product_ranking_scores;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 5: FUNCTION TO CREATE RANKING SNAPSHOT
-- ================================================================

CREATE OR REPLACE FUNCTION create_ranking_snapshot()
RETURNS TABLE(
  snapshot_id UUID,
  created_at TIMESTAMPTZ,
  total_products INT
) AS $$
DECLARE
  v_snapshot_id UUID;
  v_count INT;
BEGIN
  v_snapshot_id := gen_random_uuid();
  
  INSERT INTO product_ranking_history (product_id, ranking_score, recorded_at)
  SELECT
    product_id,
    ranking_score,
    NOW()
  FROM product_ranking_scores;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_snapshot_id, NOW(), v_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 6: FUNCTION FOR RLS POLICIES
-- ================================================================

-- Allow public read access to ranking scores
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_ranking_scores'
      AND policyname = 'ranking_scores_read_all'
  ) THEN
    CREATE POLICY ranking_scores_read_all ON product_ranking_scores
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow service role to refresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_ranking_scores'
      AND policyname = 'ranking_scores_refresh_service'
  ) THEN
    CREATE POLICY ranking_scores_refresh_service ON product_ranking_scores
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ================================================================
-- PART 7: MATERIALIZED VIEW REFRESH FUNCTION
-- ================================================================

CREATE OR REPLACE FUNCTION refresh_ranking_views()
RETURNS TABLE(
  view_name TEXT,
  refresh_status TEXT,
  duration_ms INT
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_duration INT;
BEGIN
  -- Refresh product_ranking_view
  v_start_time := CLOCK_TIMESTAMP();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_ranking_view;
  v_end_time := CLOCK_TIMESTAMP();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT * 1000;
  
  RETURN QUERY SELECT 'product_ranking_view'::TEXT, 'success'::TEXT, v_duration;
  
  -- Refresh product_trending_view
  v_start_time := CLOCK_TIMESTAMP();
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_trending_view;
  v_end_time := CLOCK_TIMESTAMP();
  v_duration := EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INT * 1000;
  
  RETURN QUERY SELECT 'product_trending_view'::TEXT, 'success'::TEXT, v_duration;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 8: EXPORT RANKING SCORES TO EXTERNAL SYSTEM
-- ================================================================

CREATE OR REPLACE FUNCTION export_ranking_scores(
  p_limit INT DEFAULT NULL,
  p_min_score DECIMAL DEFAULT 0
)
RETURNS TABLE(
  product_id UUID,
  name TEXT,
  ranking_score DECIMAL,
  purchase_count INT,
  view_count INT,
  conversion_rate DECIMAL,
  rating_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    prs.product_id,
    p.name,
    prs.ranking_score,
    prs.purchase_count,
    prs.view_count,
    prs.conversion_rate,
    prs.rating_score
  FROM product_ranking_scores prs
  JOIN products p ON prs.product_id = p.id
  WHERE prs.ranking_score >= p_min_score
  ORDER BY prs.ranking_score DESC
  LIMIT COALESCE(p_limit, 10000);
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 9: COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON TABLE ranking_refresh_logs IS 'Logs of ranking refresh operations for monitoring and debugging';
COMMENT ON TABLE ranking_config IS 'Configuration values for ranking algorithm signals and boost weights';
COMMENT ON TABLE product_ranking_history IS 'Historical snapshots of product rankings for trend analysis';
COMMENT ON FUNCTION get_ranking_statistics() IS 'Get aggregate statistics about product rankings';
COMMENT ON FUNCTION create_ranking_snapshot() IS 'Create a point-in-time snapshot of all product rankings';
COMMENT ON FUNCTION refresh_ranking_views() IS 'Refresh all ranking materialized views concurrently';
COMMENT ON FUNCTION export_ranking_scores(INT, DECIMAL) IS 'Export ranking scores for external systems or analysis';

-- ================================================================
-- END OF RANKING SUPPORT TABLES MIGRATION
-- ================================================================
