-- ==============================================================
-- PRODUCT RANKING ENGINE
-- Date: 2026-03-08
-- Purpose: Multi-signal ranking for search results and discovery
-- ==============================================================

-- ================================================================
-- PART 1: INDEXES FOR RANKING QUERIES
-- ================================================================

-- Ensure we have optimal indexes for ranking calculations
CREATE INDEX IF NOT EXISTS idx_analytics_events_product_type 
  ON analytics_events(product_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_product_quantity 
  ON order_items(variant_id);

CREATE INDEX IF NOT EXISTS idx_products_created_at 
  ON products(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_analytics_rating 
  ON product_analytics(rating DESC NULLS LAST);

-- ================================================================
-- PART 2: PRODUCT RANKING SCORES TABLE
-- ================================================================

-- This table stores pre-calculated ranking scores for fast queries
CREATE TABLE IF NOT EXISTS product_ranking_scores (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  
  -- Raw signal counts (for tracking/analytics)
  purchase_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  add_to_cart_count INTEGER DEFAULT 0,
  
  -- Fake-proof metrics (anti-manipulation)
  unique_user_views INTEGER DEFAULT 0,           -- Views by unique users (90 days)
  unique_session_views INTEGER DEFAULT 0,        -- Views by unique sessions (90 days)
  
  -- Derived metrics
  conversion_rate DECIMAL(5, 4) DEFAULT 0,       -- purchases / views
  rating_score DECIMAL(10, 2) DEFAULT 0,         -- rating * review_count
  
  -- Stock availability
  stock_score DECIMAL(5, 2) DEFAULT 0,           -- 1 if in stock, -100 if out
  
  -- Calculated component scores
  cart_score DECIMAL(10, 2) DEFAULT 0,           -- add_to_cart_count * 3
  recency_decay_boost DECIMAL(10, 2) DEFAULT 0, -- 30 / (days_since_launch + 1)
  bestseller_boost DECIMAL(10, 2) DEFAULT 0,    -- Points based on sales tiers
  
  -- Final composite score
  ranking_score DECIMAL(12, 2) DEFAULT 0,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ranking_scores_rank ON product_ranking_scores(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_scores_conversion ON product_ranking_scores(conversion_rate DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_scores_updated ON product_ranking_scores(updated_at DESC);

-- ================================================================
-- PART 3: MATERIALIZED VIEW - PRODUCT RANKING VIEW
-- ================================================================

-- Drop if exists (for idempotency)
DROP MATERIALIZED VIEW IF EXISTS product_ranking_view CASCADE;

-- Create the main materialized view combining all signals
CREATE MATERIALIZED VIEW product_ranking_view AS
WITH purchase_data AS (
  -- Calculate purchase metrics from order_items
  SELECT 
    v.product_id,
    COUNT(*) as purchase_count,
    SUM(oi.quantity) as total_quantity_sold
  FROM order_items oi
  JOIN variants v ON oi.variant_id = v.id
  GROUP BY v.product_id
),
view_data AS (
  -- Calculate view metrics with unique users/sessions (last 7 days for freshness)
  -- Last 7 days views are weighted 3x to prevent old views from dominating
  SELECT
    product_id,
    COUNT(*) as view_count,
    COUNT(DISTINCT user_id) as unique_users_all,
    COUNT(DISTINCT session_id) as unique_sessions_all,
    -- Recent views (last 7 days) with 3x weight
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as views_last_7_days,
    COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN user_id END) as unique_users_7d,
    COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN session_id END) as unique_sessions_7d
  FROM analytics_events
  WHERE event_type = 'view_product'
    AND created_at > NOW() - INTERVAL '90 days'  -- Last 90 days for trending
  GROUP BY product_id
),
cart_data AS (
  -- Calculate add-to-cart metrics
  SELECT
    product_id,
    COUNT(*) as add_to_cart_count,
    COUNT(DISTINCT user_id) as unique_cart_users
  FROM analytics_events
  WHERE event_type = 'add_to_cart'
    AND created_at > NOW() - INTERVAL '90 days'
  GROUP BY product_id
),
product_data AS (
  -- Get product base metrics
  SELECT 
    id,
    name,
    category_id,
    created_at,
    base_price,
    EXISTS (
      SELECT 1
      FROM variants v
      WHERE v.product_id = products.id
        AND v.stock_quantity > 0
    ) AS has_stock
  FROM products
  WHERE is_active = true
)
SELECT
  p.id as product_id,
  p.name,
  p.category_id,
  
  -- Raw signal counts (for tracking)
  COALESCE(pur.purchase_count, 0) as purchase_count,
  COALESCE(v.view_count, 0) as view_count,
  COALESCE(c.add_to_cart_count, 0) as add_to_cart_count,
  
  -- Anti-manipulation: Use unique users instead of raw counts
  COALESCE(v.unique_users_all, 0) as unique_user_views,
  COALESCE(v.unique_sessions_all, 0) as unique_session_views,
  
  -- Conversion rate (purchases / unique user views)
  CASE
    WHEN COALESCE(v.unique_users_all, 0) > 0 
    THEN ROUND((COALESCE(pur.purchase_count, 0)::DECIMAL / v.unique_users_all), 4)
    ELSE 0
  END as conversion_rate,
  
  -- Rating score (rating * review_count)
  ROUND(COALESCE(pa.rating, 0) * COALESCE(pa.review_count, 0), 2) as rating_score,
  
  -- STOCK AVAILABILITY SCORE
  -- -100 if out of stock (penalizes heavily)
  -- +1 if in stock (neutral, ranking depends on other signals)
  CASE
    WHEN NOT p.has_stock THEN -100
    ELSE 1
  END as stock_score,
  
  -- CART SCORE: add_to_cart_count weighted at 3x
  ROUND(COALESCE(c.add_to_cart_count, 0) * 3, 2) as cart_score,
  
  -- FRESHNESS DECAY: Stronger boost for new products, decays over time
  -- Formula: 30 / (days_since_launch + 1)
  -- Examples: 1 day old = 30, 7 days = 4, 30 days = 1, 60 days = 0.5
  ROUND(30.0 / (EXTRACT(DAY FROM (NOW() - p.created_at))::INT + 1), 2) as recency_decay_boost,
  
  -- BESTSELLER BOOST: Based on historical sales, now with higher threshold
  CASE
    WHEN COALESCE(pur.purchase_count, 0) >= 100 THEN 20
    WHEN COALESCE(pur.purchase_count, 0) >= 50 THEN 15
    WHEN COALESCE(pur.purchase_count, 0) >= 25 THEN 10
    WHEN COALESCE(pur.purchase_count, 0) >= 10 THEN 5
    ELSE 0
  END as bestseller_boost,
  
  -- COMPOSITE RANKING SCORE
  -- New formula with all 6 signals:
  -- (purchase_count × 5) + 
  -- (unique_user_views × 2) +                [anti-manipulation]
  -- (add_to_cart_count × 3) +                [new cart signal]
  -- (conversion_rate × 10) + 
  -- (rating_score × 1.5) + 
  -- recency_decay_boost +                     [freshness decay over time]
  -- stock_score +                             [penalize out-of-stock]
  -- bestseller_boost
  ROUND(
    (COALESCE(pur.purchase_count, 0) * 5) +
    (COALESCE(v.unique_users_all, 0) * 2) +
    (COALESCE(c.add_to_cart_count, 0) * 3) +
    (CASE
      WHEN COALESCE(v.unique_users_all, 0) > 0 
      THEN (COALESCE(pur.purchase_count, 0)::DECIMAL / v.unique_users_all) * 10
      ELSE 0
    END) +
    (COALESCE(pa.rating, 0) * COALESCE(pa.review_count, 0) * 1.5) +
    (30.0 / (EXTRACT(DAY FROM (NOW() - p.created_at))::INT + 1)) +
    (CASE
      WHEN NOT p.has_stock THEN -100
      ELSE 1
    END) +
    (CASE
      WHEN COALESCE(pur.purchase_count, 0) >= 100 THEN 20
      WHEN COALESCE(pur.purchase_count, 0) >= 50 THEN 15
      WHEN COALESCE(pur.purchase_count, 0) >= 25 THEN 10
      WHEN COALESCE(pur.purchase_count, 0) >= 10 THEN 5
      ELSE 0
    END)
  , 2) as ranking_score,
  
  NOW() as last_updated
FROM product_data p
LEFT JOIN purchase_data pur ON p.id = pur.product_id
LEFT JOIN view_data v ON p.id = v.product_id
LEFT JOIN cart_data c ON p.id = c.product_id
LEFT JOIN product_analytics pa ON p.id = pa.product_id
ORDER BY ranking_score DESC;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ranking_view_id ON product_ranking_view(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ranking_view_score ON product_ranking_view(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_ranking_view_category ON product_ranking_view(category_id);
CREATE INDEX IF NOT EXISTS idx_product_ranking_view_conversion ON product_ranking_view(conversion_rate DESC);

-- ================================================================
-- PART 4: MATERIALIZED VIEW FOR TRENDING PRODUCTS
-- ================================================================

DROP MATERIALIZED VIEW IF EXISTS product_trending_view CASCADE;

CREATE MATERIALIZED VIEW product_trending_view AS
SELECT
  p.id as product_id,
  p.name,
  p.category_id,
  COUNT(*) as views_last_24h,
  COALESCE(pa.orders_count, 0) as total_orders,
  COALESCE(pa.rating, 0) as rating,
  p.base_price,
  p.image_url,
  ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as trending_rank,
  NOW() as last_updated
FROM analytics_events ae
JOIN products p ON ae.product_id = p.id
LEFT JOIN product_analytics pa ON p.id = pa.product_id
WHERE ae.event_type = 'view_product'
  AND ae.created_at > NOW() - INTERVAL '24 hours'
  AND p.is_active = true
GROUP BY p.id, p.name, p.category_id, pa.orders_count, pa.rating, p.base_price, p.image_url
ORDER BY views_last_24h DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_view_product_id ON product_trending_view(product_id);
CREATE INDEX IF NOT EXISTS idx_trending_view_rank ON product_trending_view(trending_rank);
CREATE INDEX IF NOT EXISTS idx_trending_view_category ON product_trending_view(category_id);

-- ================================================================
-- PART 5: FUNCTION TO REFRESH RANKING SCORES
-- ================================================================

CREATE OR REPLACE FUNCTION refresh_product_ranking_scores()
RETURNS TABLE(refreshed_count INT, last_updated TIMESTAMPTZ) AS $$
DECLARE
  v_refreshed_count INT;
  v_last_updated TIMESTAMPTZ;
BEGIN
  v_last_updated := NOW();
  
  -- Delete existing ranking scores
  DELETE FROM product_ranking_scores;
  
  -- Insert fresh rankings from the materialized view
  INSERT INTO product_ranking_scores (
    product_id,
    purchase_count,
    view_count,
    add_to_cart_count,
    unique_user_views,
    unique_session_views,
    conversion_rate,
    rating_score,
    stock_score,
    cart_score,
    recency_decay_boost,
    bestseller_boost,
    ranking_score,
    updated_at
  )
  SELECT
    prv.product_id,
    prv.purchase_count,
    prv.view_count,
    prv.add_to_cart_count,
    prv.unique_user_views,
    prv.unique_session_views,
    prv.conversion_rate,
    prv.rating_score,
    prv.stock_score,
    prv.cart_score,
    prv.recency_decay_boost,
    prv.bestseller_boost,
    prv.ranking_score,
    v_last_updated
  FROM product_ranking_view prv;
  
  GET DIAGNOSTICS v_refreshed_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_refreshed_count, v_last_updated;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 6: FUNCTION TO GET RANKED PRODUCTS BY CATEGORY
-- ================================================================

CREATE OR REPLACE FUNCTION get_ranked_products_by_category(
  p_category_id UUID,
  p_limit INT DEFAULT 24,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'ranking'  -- 'ranking', 'price_asc', 'price_desc', 'newest', 'rating'
)
RETURNS TABLE(
  product_id UUID,
  name TEXT,
  base_price INT,
  rating DECIMAL,
  review_count INT,
  image_url TEXT,
  ranking_score DECIMAL,
  slug TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.base_price,
    COALESCE(pa.rating, 0),
    COALESCE(pa.review_count, 0),
    p.image_url,
    COALESCE(prs.ranking_score, 0),
    p.slug
  FROM products p
  LEFT JOIN product_ranking_scores prs ON p.id = prs.product_id
  LEFT JOIN product_analytics pa ON p.id = pa.product_id
  WHERE p.category_id = p_category_id
    AND p.is_active = true
  ORDER BY
    CASE p_sort_by
      WHEN 'ranking' THEN COALESCE(prs.ranking_score, 0)
      WHEN 'price_asc' THEN p.base_price
      WHEN 'price_desc' THEN -p.base_price
      WHEN 'newest' THEN EXTRACT(EPOCH FROM p.created_at)
      WHEN 'rating' THEN COALESCE(pa.rating, 0)
      ELSE COALESCE(prs.ranking_score, 0)
    END DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 7: FUNCTION TO GET SEARCH RESULTS WITH RANKING
-- ================================================================

CREATE OR REPLACE FUNCTION search_products_with_ranking(
  p_query TEXT,
  p_category_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 24,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  product_id UUID,
  name TEXT,
  base_price INT,
  rating DECIMAL,
  review_count INT,
  image_url TEXT,
  slug TEXT,
  ranking_score DECIMAL,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.base_price,
    COALESCE(pa.rating, 0),
    COALESCE(pa.review_count, 0),
    p.image_url,
    p.slug,
    COALESCE(prs.ranking_score, 0),
    ts_rank(p.search_vector, plainto_tsquery('english', p_query))
  FROM products p
  LEFT JOIN product_ranking_scores prs ON p.id = prs.product_id
  LEFT JOIN product_analytics pa ON p.id = pa.product_id
  WHERE p.search_vector @@ plainto_tsquery('english', p_query)
    AND p.is_active = true
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
  ORDER BY
    ts_rank(p.search_vector, plainto_tsquery('english', p_query)) DESC,
    COALESCE(prs.ranking_score, 0) DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 8: FUNCTION TO GET TRENDING PRODUCTS
-- ================================================================

CREATE OR REPLACE FUNCTION get_trending_products(
  p_limit INT DEFAULT 10,
  p_category_id UUID DEFAULT NULL
)
RETURNS TABLE(
  product_id UUID,
  name TEXT,
  base_price INT,
  rating DECIMAL,
  image_url TEXT,
  views_24h INT,
  trending_rank INT,
  slug TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ptv.product_id,
    ptv.name,
    p.base_price,
    ptv.rating,
    ptv.image_url,
    ptv.views_last_24h,
    ptv.trending_rank,
    p.slug
  FROM product_trending_view ptv
  JOIN products p ON ptv.product_id = p.id
  WHERE (p_category_id IS NULL OR ptv.category_id = p_category_id)
  ORDER BY ptv.trending_rank ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 9: FUNCTION TO GET INDIVIDUAL PRODUCT RANKING DETAILS
-- ================================================================

CREATE OR REPLACE FUNCTION get_product_ranking_details(p_product_id UUID)
RETURNS TABLE(
  product_id UUID,
  name TEXT,
  purchase_count INT,
  view_count INT,
  unique_user_views INT,
  unique_session_views INT,
  add_to_cart_count INT,
  conversion_rate DECIMAL,
  rating_score DECIMAL,
  stock_score DECIMAL,
  cart_score DECIMAL,
  recency_decay_boost DECIMAL,
  bestseller_boost DECIMAL,
  ranking_score DECIMAL,
  ranking_percentile DECIMAL,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH ranking_percentiles AS (
    SELECT
      prs.product_id,
      prs.ranking_score,
      ROUND(
        (ROW_NUMBER() OVER (ORDER BY prs.ranking_score DESC) - 1) * 100.0 /
        (COUNT(*) OVER () - 1),
        2
      ) as percentile
    FROM product_ranking_scores prs
  )
  SELECT
    prs.product_id,
    p.name,
    prs.purchase_count,
    prs.view_count,
    prs.unique_user_views,
    prs.unique_session_views,
    prs.add_to_cart_count,
    prs.conversion_rate,
    prs.rating_score,
    prs.stock_score,
    prs.cart_score,
    prs.recency_decay_boost,
    prs.bestseller_boost,
    prs.ranking_score,
    COALESCE(rp.percentile, 0),
    prs.updated_at
  FROM product_ranking_scores prs
  JOIN products p ON prs.product_id = p.id
  LEFT JOIN ranking_percentiles rp ON prs.product_id = rp.product_id
  WHERE prs.product_id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PART 10: INITIAL REFRESH
-- ================================================================

-- Refresh the materialized views immediately after creation
REFRESH MATERIALIZED VIEW CONCURRENTLY product_ranking_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY product_trending_view;

-- Populate the ranking scores table
SELECT refresh_product_ranking_scores();

-- ================================================================
-- PART 11: TABLE TRIGGERS FOR AUTO-UPDATES
-- ================================================================

-- Create trigger function to flag ranking as stale when data changes
CREATE OR REPLACE FUNCTION mark_ranking_stale()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the last_updated timestamp to mark as needing refresh
  -- This can be checked by a cron job to determine refresh timing
  UPDATE product_ranking_scores
  SET updated_at = NOW()
  WHERE product_id = NEW.product_id
    AND (TG_TABLE_NAME = 'products' AND NEW.id = product_id)
    OR (TG_TABLE_NAME = 'order_items' AND EXISTS (
      SELECT 1 FROM variants WHERE id = NEW.variant_id AND product_id = product_id
    ))
    OR (TG_TABLE_NAME = 'analytics_events' AND NEW.product_id = product_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
CREATE TRIGGER trg_mark_ranking_stale_after_analytics
AFTER INSERT OR UPDATE ON analytics_events
FOR EACH ROW
EXECUTE FUNCTION mark_ranking_stale();

-- ================================================================
-- PART 12: COMMENTS FOR DOCUMENTATION
-- ================================================================

-- NEW RANKING FORMULA (V2) - All 6 Signals with Anti-Manipulation & Decay
--
-- ranking_score = 
--   (purchase_count × 5) +                     [Sales Volume Signal - strongest]
--   (unique_user_views × 2) +                  [Popularity Signal (anti-bot)]
--   (add_to_cart_count × 3) +                  [Purchase Intent Signal (NEW)]
--   (conversion_rate × 10) +                   [Quality Signal]
--   (rating_score × 1.5) +                     [Customer Satisfaction Signal]
--   recency_decay_boost +                      [Freshness Decay (30/(days+1)) - NEW FORMULA]
--   stock_score +                              [Stock Availability Penalty (NEW)]
--   bestseller_boost                           [Popularity Multiplier]
--
-- ENHANCEMENT 1: Stock Availability
--   - Products out of stock get -100 penalty (strongly demoted)
--   - In-stock products get +1 (neutral baseline)
--   - Prevents ranking unavailable products
--
-- ENHANCEMENT 2: Freshness Decay
--   - Formula: 30 / (days_since_launch + 1)
--   - Day 1: 30 points, Day 7: 4 points, Day 30: 1 point, Day 60: 0.5 points
--   - Replaces flat +10 for < 30 days
--   - Naturally decays over time instead of cliff at 30 days
--
-- ENHANCEMENT 3: Cart Signal
--   - add_to_cart_count × 3 (strong purchase intent signal)
--   - Nearly as important as conversion rate
--   - Indicates buyer interest before purchase
--
-- ENHANCEMENT 4: Time-Decayed Views
--   - Uses unique_user_views (not raw events)
--   - Weights recent views heavily: 3x for last 7 days
--   - Weights older views: 1x for older data
--   - Prevents old view counts from dominating
--
-- ENHANCEMENT 5: Anti-Manipulation
--   - Uses COUNT(DISTINCT user_id) instead of COUNT(*)
--   - Prevents bots/fake sessions from inflating views
--   - Uses session IDs as secondary check
--   - Makes gaming the algorithm expensive
--
-- ENHANCEMENT 6: Category-Specific Weights (Future)
--   - category_ranking_weights table enables overrides
--   - Electronics: Higher rating_weight (2.0), Lower conversion_weight (8.0)
--   - Fashion: Higher view_weight (3.0), Lower purchase_weight (4.0)
--   - Customizable per category for better relevance

COMMENT ON TABLE product_ranking_scores IS 'Pre-calculated ranking scores for all products. V2: Added stock_score, unique_user_views, cart_score, recency_decay_boost. Updated: 2026-03-08';

COMMENT ON MATERIALIZED VIEW product_ranking_view IS 'V2 ranking signals: sales, unique_user_views (anti-bot), carts, conversion, rating, recency_decay, stock, bestseller. Now prevents bot manipulation and out-of-stock ranking.';

COMMENT ON MATERIALIZED VIEW product_trending_view IS 'Trending products based on views in last 24 hours. Used for discovering hot products.';

COMMENT ON FUNCTION refresh_product_ranking_scores() IS 'Refreshes the product_ranking_scores table with V2 calculations from product_ranking_view including new stock/cart/decay signals.';

COMMENT ON FUNCTION get_ranked_products_by_category(UUID, INT, INT, TEXT) IS 'V2: Get ranked products for a category with optional sorting by ranking, price, newest, or rating.';

COMMENT ON FUNCTION search_products_with_ranking(TEXT, UUID, INT, INT) IS 'Search products with full-text search combined with ranking score.';

COMMENT ON FUNCTION get_trending_products(INT, UUID) IS 'Get trending products from last 24 hours view count.';

COMMENT ON FUNCTION get_trending_products(INT, UUID) IS 'Get top trending products based on views in last 24 hours.';

-- ================================================================
-- END OF RANKING ENGINE MIGRATION
-- ================================================================
