-- ==============================================================
-- ADVANCED MULTI-LAYER RANKING ENGINE (PHASE 4)
-- Date: 2026-03-13
-- Purpose: Global ranking, trending, engagement, personalization,
--          similar products, category ranking, and behavioral recs.
-- ==============================================================

-- --------------------------------------------------------------
-- 1) Event weights configuration
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ranking_event_weights (
  event_type TEXT PRIMARY KEY,
  weight NUMERIC(10,4) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ranking_event_weights (event_type, weight)
VALUES
  ('product_view', 1),
  ('product_click', 2),
  ('add_to_cart', 6),
  ('wishlist_add', 4),
  ('purchase', 12),
  ('search_click', 2),
  ('scroll_depth', 1),
  ('time_on_product', 1)
ON CONFLICT (event_type) DO UPDATE SET
  weight = EXCLUDED.weight,
  updated_at = NOW();

-- --------------------------------------------------------------
-- 2) Product feature vectors (JSON-based for cosine similarity)
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_feature_vectors (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID,
  vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_feature_vectors_category
  ON product_feature_vectors(category_id);

-- --------------------------------------------------------------
-- 3) User category behavior vectors
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_category_vectors (
  firebase_uid TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  raw_weight NUMERIC(14,4) NOT NULL DEFAULT 0,
  normalized_weight NUMERIC(14,6) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (firebase_uid, category_id)
);

CREATE INDEX IF NOT EXISTS idx_user_category_vectors_uid
  ON user_category_vectors(firebase_uid);

-- --------------------------------------------------------------
-- 4) Re-ranking factors for business constraints
-- --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_reranking_factors (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  promotion_boost NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  margin_factor NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  diversity_penalty NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_promotion_boost_positive CHECK (promotion_boost > 0),
  CONSTRAINT chk_margin_factor_positive CHECK (margin_factor > 0),
  CONSTRAINT chk_diversity_penalty_positive CHECK (diversity_penalty > 0)
);

-- --------------------------------------------------------------
-- 5) Analytics event logging helper (normalized to analytics_events)
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_product_interaction_v3(
  p_event_type TEXT,
  p_product_id UUID,
  p_user_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_time_on_product_seconds NUMERIC DEFAULT NULL,
  p_scroll_depth NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
  v_normalized_event_type TEXT;
  v_metadata JSONB;
BEGIN
  v_normalized_event_type := CASE p_event_type
    WHEN 'product_view' THEN 'view_product'
    WHEN 'product_click' THEN 'click_product'
    WHEN 'add_to_cart' THEN 'add_to_cart'
    WHEN 'wishlist_add' THEN 'wishlist_add'
    WHEN 'purchase' THEN 'purchase'
    WHEN 'search_click' THEN 'search_click'
    WHEN 'scroll_depth' THEN 'scroll_depth'
    WHEN 'time_on_product' THEN 'time_on_product'
    ELSE p_event_type
  END;

  v_metadata := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object(
      'source_event_type', p_event_type,
      'time_on_product_seconds', p_time_on_product_seconds,
      'scroll_depth', p_scroll_depth,
      'firebase_uid', p_user_id
    );

  INSERT INTO analytics_events (
    event_type,
    product_id,
    user_id,
    session_id,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_normalized_event_type,
    p_product_id,
    NULL,
    p_session_id,
    v_metadata,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------
-- 6) Materialized view with full multi-layer scoring
-- --------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS product_ranking_multilayer_v3 CASCADE;

CREATE MATERIALIZED VIEW product_ranking_multilayer_v3 AS
WITH event_agg AS (
  SELECT
    ae.product_id,
    COUNT(*) FILTER (WHERE ae.event_type IN ('view_product', 'product_view')) AS views,
    COUNT(*) FILTER (WHERE ae.event_type IN ('click_product', 'product_click', 'search_click')) AS clicks,
    COUNT(*) FILTER (WHERE ae.event_type = 'add_to_cart') AS add_to_cart,
    COUNT(*) FILTER (WHERE ae.event_type = 'wishlist_add') AS wishlist_add,
    COUNT(*) FILTER (WHERE ae.event_type = 'purchase') AS purchases,
    COALESCE(AVG(CASE
      WHEN ae.event_type = 'time_on_product'
      THEN NULLIF((ae.metadata ->> 'time_on_product_seconds')::NUMERIC, 0)
      ELSE NULL
    END), 0) AS avg_time_seconds,
    COUNT(*) FILTER (
      WHERE ae.created_at > NOW() - INTERVAL '6 hours'
        AND ae.event_type IN ('view_product', 'product_view')
    ) AS views_last_6h,
    COUNT(*) FILTER (
      WHERE ae.created_at > NOW() - INTERVAL '6 hours'
        AND ae.event_type = 'purchase'
    ) AS purchases_last_6h,
    COUNT(*) FILTER (
      WHERE ae.created_at > NOW() - INTERVAL '48 hours'
        AND ae.event_type IN ('view_product', 'product_view')
    ) AS views_last_48h,
    COUNT(*) FILTER (
      WHERE ae.created_at > NOW() - INTERVAL '48 hours'
        AND ae.event_type = 'purchase'
    ) AS purchases_last_48h,
    COUNT(*) FILTER (
      WHERE ae.created_at > NOW() - INTERVAL '24 hours'
        AND ae.event_type = 'purchase'
    ) AS purchases_last_24h,
    COUNT(*) FILTER (
      WHERE ae.created_at > NOW() - INTERVAL '7 days'
        AND ae.event_type = 'purchase'
    ) AS purchases_last_7d,
    COUNT(*) FILTER (
      WHERE ae.created_at > NOW() - INTERVAL '30 days'
        AND ae.event_type = 'purchase'
    ) AS purchases_last_30d,
    MAX(CASE WHEN ae.event_type = 'purchase' THEN ae.created_at ELSE NULL END) AS last_sale_at
  FROM analytics_events ae
  WHERE ae.product_id IS NOT NULL
  GROUP BY ae.product_id
),
global_review_stats AS (
  SELECT
    COALESCE(AVG(NULLIF(p.average_rating, 0))::NUMERIC(10,4), 4.0) AS c
  FROM products p
  WHERE p.is_active = TRUE
),
product_base AS (
  SELECT
    p.id AS product_id,
    p.category_id,
    p.base_price,
    p.created_at,
    p.is_active,
    COALESCE(p.average_rating::NUMERIC, 0) AS products_avg_rating,
    COALESCE(p.review_count, 0) AS products_review_count,
    EXISTS (
      SELECT 1
      FROM variants v
      WHERE v.product_id = p.id
        AND COALESCE(v.stock_quantity, 0) > 0
    ) AS in_stock,
    CASE WHEN COALESCE(p.is_on_sale, false) THEN 1.15 ELSE 1.0 END AS default_promotion_boost
  FROM products p
  WHERE p.is_active = TRUE
),
raw_scores AS (
  SELECT
    pb.product_id,
    pb.category_id,
    pb.base_price,
    pb.in_stock,
    pb.default_promotion_boost,
    COALESCE(ea.views, 0) AS views,
    COALESCE(ea.clicks, 0) AS clicks,
    COALESCE(ea.add_to_cart, 0) AS add_to_cart,
    COALESCE(ea.wishlist_add, 0) AS wishlist_add,
    COALESCE(ea.purchases, 0) AS purchases,
    COALESCE(ea.avg_time_seconds, 0) AS avg_time_seconds,
    COALESCE(ea.purchases_last_24h, 0) AS purchases_last_24h,
    COALESCE(ea.purchases_last_7d, 0) AS purchases_last_7d,
    COALESCE(ea.purchases_last_30d, 0) AS purchases_last_30d,
    ea.last_sale_at,
    COALESCE(ea.views_last_6h, 0) AS views_last_6h,
    COALESCE(ea.purchases_last_6h, 0) AS purchases_last_6h,
    COALESCE(ea.views_last_48h, 0) AS views_last_48h,
    COALESCE(ea.purchases_last_48h, 0) AS purchases_last_48h,
    GREATEST(EXTRACT(EPOCH FROM (NOW() - pb.created_at)) / 86400.0, 0) AS product_age_days,
    COALESCE(NULLIF(pb.products_avg_rating, 0), 0) AS avg_rating,
    COALESCE(NULLIF(pb.products_review_count, 0), 0) AS review_count
  FROM product_base pb
  LEFT JOIN event_agg ea ON ea.product_id = pb.product_id
),
scored AS (
  SELECT
    rs.*,
    (
      (rs.views * 1.0)
      + (rs.clicks * 2.0)
      + (rs.wishlist_add * 4.0)
      + (rs.add_to_cart * 6.0)
      + (rs.purchases * 12.0)
      + (rs.avg_time_seconds / 30.0)
    ) AS engagement_score,
    LN(1 + (
      (rs.views * 1.0)
      + (rs.clicks * 2.0)
      + (rs.wishlist_add * 4.0)
      + (rs.add_to_cart * 6.0)
      + (rs.purchases * 12.0)
      + (rs.avg_time_seconds / 30.0)
    )) AS engagement_normalized,
    (
      rs.purchases_last_24h
      + (rs.purchases_last_7d * 0.5)
      + (rs.purchases_last_30d * 0.2)
    ) AS sales_velocity,
    (
      (rs.purchases::NUMERIC / GREATEST(rs.views, 1))
      * LN(rs.views + 1)
    ) AS conversion_score,
    EXP(-rs.product_age_days / 30.0) AS freshness_score,
    ((rs.views_last_6h + (rs.purchases_last_6h * 5.0))::NUMERIC
      / (rs.views_last_48h + (rs.purchases_last_48h * 5.0) + 1)::NUMERIC
    ) AS trend_growth,
    CASE
      WHEN rs.last_sale_at IS NULL THEN 0
      ELSE GREATEST(EXTRACT(EPOCH FROM (NOW() - rs.last_sale_at)) / 86400.0, 0)
    END AS days_since_last_sale
  FROM raw_scores rs
),
bayesian AS (
  SELECT
    s.*,
    (
      (s.review_count::NUMERIC / (s.review_count + 5.0)) * s.avg_rating
      + (5.0 / (s.review_count + 5.0)) * grs.c
    ) AS rating_score
  FROM scored s
  CROSS JOIN global_review_stats grs
),
final_calc AS (
  SELECT
    b.*,
    (b.sales_velocity * EXP(-b.days_since_last_sale / 14.0)) AS sales_velocity_decay,
    ((0.6 * b.engagement_normalized) + (0.4 * b.sales_velocity)) AS popularity_score,
    (
      (0.30 * (b.sales_velocity * EXP(-b.days_since_last_sale / 14.0)))
      + (0.25 * b.engagement_normalized)
      + (0.20 * b.conversion_score)
      + (0.15 * b.rating_score)
      + (0.10 * b.freshness_score)
    ) AS global_score,
    (b.trend_growth * b.engagement_normalized) AS trending_score
  FROM bayesian b
)
SELECT
  fc.product_id,
  fc.category_id,
  fc.base_price,
  fc.views,
  fc.clicks,
  fc.add_to_cart,
  fc.wishlist_add,
  fc.purchases,
  fc.avg_time_seconds,
  fc.engagement_score,
  fc.engagement_normalized,
  fc.sales_velocity,
  fc.sales_velocity_decay,
  (fc.purchases::NUMERIC / GREATEST(fc.views, 1)) AS conversion_rate,
  fc.conversion_score,
  fc.rating_score,
  fc.freshness_score,
  fc.popularity_score,
  fc.global_score,
  fc.trending_score,
  CASE WHEN fc.in_stock THEN 1.0 ELSE 0.2 END AS stock_factor,
  COALESCE(prf.promotion_boost, fc.default_promotion_boost, 1.0) AS promotion_boost,
  COALESCE(prf.margin_factor, 1.0) AS margin_factor,
  COALESCE(prf.diversity_penalty, 1.0) AS diversity_penalty,
  (
    fc.global_score
    * CASE WHEN fc.in_stock THEN 1.0 ELSE 0.2 END
    * COALESCE(prf.promotion_boost, fc.default_promotion_boost, 1.0)
    * COALESCE(prf.margin_factor, 1.0)
    * COALESCE(prf.diversity_penalty, 1.0)
  ) AS final_score,
  NOW() AS updated_at
FROM final_calc fc
LEFT JOIN product_reranking_factors prf
  ON prf.product_id = fc.product_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ranking_multilayer_v3_product
  ON product_ranking_multilayer_v3(product_id);

CREATE INDEX IF NOT EXISTS idx_product_ranking_multilayer_v3_global
  ON product_ranking_multilayer_v3(global_score DESC);

CREATE INDEX IF NOT EXISTS idx_product_ranking_multilayer_v3_trending
  ON product_ranking_multilayer_v3(trending_score DESC);

CREATE INDEX IF NOT EXISTS idx_product_ranking_multilayer_v3_final
  ON product_ranking_multilayer_v3(final_score DESC);

CREATE INDEX IF NOT EXISTS idx_product_ranking_multilayer_v3_category
  ON product_ranking_multilayer_v3(category_id, final_score DESC);

-- --------------------------------------------------------------
-- 7) Product feature vector refresh
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_product_feature_vectors()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO product_feature_vectors (product_id, category_id, vector, generated_at)
  SELECT
    p.id,
    p.category_id,
    jsonb_build_object(
      'category_match', 1.0,
      'price_norm', LEAST(p.base_price::NUMERIC / 10000.0, 1.0),
      'rating_norm', LEAST(COALESCE(p.average_rating, 0)::NUMERIC / 5.0, 1.0),
      'freshness_norm', EXP(-GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0, 0) / 30.0)
    ),
    NOW()
  FROM products p
  WHERE p.is_active = TRUE
  ON CONFLICT (product_id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    vector = EXCLUDED.vector,
    generated_at = NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------
-- 8) User behavior vectors refresh
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_user_category_vectors()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM user_category_vectors;

  WITH view_weights AS (
    SELECT
      COALESCE(ae.metadata ->> 'firebase_uid', NULL) AS firebase_uid,
      p.category_id,
      COUNT(*)::NUMERIC AS weighted
    FROM analytics_events ae
    JOIN products p ON p.id = ae.product_id
    WHERE ae.event_type IN ('view_product', 'product_view')
      AND COALESCE(ae.metadata ->> 'firebase_uid', '') <> ''
    GROUP BY 1, 2
  ),
  wishlist_weights AS (
    SELECT
      awi.firebase_uid,
      p.category_id,
      COUNT(*)::NUMERIC * 4.0 AS weighted
    FROM account_wishlist_items awi
    JOIN products p ON p.id = awi.product_id
    GROUP BY 1, 2
  ),
  purchase_weights AS (
    SELECT
      o.firebase_uid,
      p.category_id,
      SUM(oi.quantity)::NUMERIC * 6.0 AS weighted
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN variants v ON v.id = oi.variant_id
    JOIN products p ON p.id = v.product_id
    GROUP BY 1, 2
  ),
  combined AS (
    SELECT firebase_uid, category_id, SUM(weighted) AS raw_weight
    FROM (
      SELECT * FROM view_weights
      UNION ALL
      SELECT * FROM wishlist_weights
      UNION ALL
      SELECT * FROM purchase_weights
    ) x
    WHERE firebase_uid IS NOT NULL
    GROUP BY firebase_uid, category_id
  ),
  normalized AS (
    SELECT
      c.firebase_uid,
      c.category_id,
      c.raw_weight,
      CASE
        WHEN SUM(c.raw_weight) OVER (PARTITION BY c.firebase_uid) = 0 THEN 0
        ELSE c.raw_weight / SUM(c.raw_weight) OVER (PARTITION BY c.firebase_uid)
      END AS normalized_weight
    FROM combined c
  )
  INSERT INTO user_category_vectors (firebase_uid, category_id, raw_weight, normalized_weight, computed_at)
  SELECT
    n.firebase_uid,
    n.category_id,
    n.raw_weight,
    n.normalized_weight,
    NOW()
  FROM normalized n;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------
-- 9) JSONB cosine similarity helper
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION cosine_similarity_jsonb(a JSONB, b JSONB)
RETURNS NUMERIC AS $$
DECLARE
  k TEXT;
  va NUMERIC;
  vb NUMERIC;
  dot NUMERIC := 0;
  norm_a NUMERIC := 0;
  norm_b NUMERIC := 0;
BEGIN
  FOR k IN
    SELECT key
    FROM (
      SELECT jsonb_object_keys(COALESCE(a, '{}'::jsonb)) AS key
      UNION
      SELECT jsonb_object_keys(COALESCE(b, '{}'::jsonb)) AS key
    ) keys
  LOOP
    va := COALESCE((a ->> k)::NUMERIC, 0);
    vb := COALESCE((b ->> k)::NUMERIC, 0);

    dot := dot + (va * vb);
    norm_a := norm_a + (va * va);
    norm_b := norm_b + (vb * vb);
  END LOOP;

  IF norm_a = 0 OR norm_b = 0 THEN
    RETURN 0;
  END IF;

  RETURN dot / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- --------------------------------------------------------------
-- 10) Read functions for each ranking layer
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_global_ranked_products_v3(
  p_limit INT DEFAULT 24,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  product_id UUID,
  global_score NUMERIC,
  final_score NUMERIC,
  engagement_normalized NUMERIC,
  sales_velocity_decay NUMERIC,
  conversion_score NUMERIC,
  rating_score NUMERIC,
  freshness_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.product_id,
    r.global_score,
    r.final_score,
    r.engagement_normalized,
    r.sales_velocity_decay,
    r.conversion_score,
    r.rating_score,
    r.freshness_score
  FROM product_ranking_multilayer_v3 r
  ORDER BY r.global_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_trending_products_v3(
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  product_id UUID,
  trending_score NUMERIC,
  trend_growth NUMERIC,
  engagement_normalized NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.product_id,
    r.trending_score,
    CASE
      WHEN (r.views + r.purchases) = 0 THEN 0
      ELSE r.trending_score / GREATEST(r.engagement_normalized, 0.0001)
    END AS trend_growth,
    r.engagement_normalized
  FROM product_ranking_multilayer_v3 r
  ORDER BY r.trending_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_category_ranked_products_v3(
  p_category_id UUID,
  p_limit INT DEFAULT 24,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  product_id UUID,
  category_id UUID,
  final_score NUMERIC,
  global_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.product_id,
    r.category_id,
    r.final_score,
    r.global_score
  FROM product_ranking_multilayer_v3 r
  WHERE r.category_id = p_category_id
  ORDER BY r.final_score DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_personalized_recommendations_v3(
  p_firebase_uid TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  product_id UUID,
  global_score NUMERIC,
  user_interest_weight NUMERIC,
  personal_score NUMERIC,
  hybrid_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH interests AS (
    SELECT
      ucv.category_id,
      ucv.normalized_weight
    FROM user_category_vectors ucv
    WHERE ucv.firebase_uid = p_firebase_uid
  ),
  base AS (
    SELECT
      r.product_id,
      r.global_score,
      r.category_id,
      COALESCE(i.normalized_weight, 0) AS user_interest_weight
    FROM product_ranking_multilayer_v3 r
    LEFT JOIN interests i ON i.category_id = r.category_id
  )
  SELECT
    b.product_id,
    b.global_score,
    b.user_interest_weight,
    (b.global_score * b.user_interest_weight) AS personal_score,
    ((0.7 * (b.global_score * b.user_interest_weight)) + (0.3 * b.global_score)) AS hybrid_score
  FROM base b
  ORDER BY hybrid_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_similar_products_v3(
  p_product_id UUID,
  p_limit INT DEFAULT 12
)
RETURNS TABLE(
  product_id UUID,
  similarity NUMERIC,
  vector_similarity NUMERIC,
  category_match NUMERIC,
  price_similarity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT
      pfv.product_id,
      pfv.category_id,
      pfv.vector,
      p.base_price
    FROM product_feature_vectors pfv
    JOIN products p ON p.id = pfv.product_id
    WHERE pfv.product_id = p_product_id
  )
  SELECT
    c.product_id,
    (
      (0.6 * cosine_similarity_jsonb(t.vector, c.vector))
      + (0.2 * CASE WHEN c.category_id = t.category_id THEN 1 ELSE 0 END)
      + (0.2 * (1 - ABS(p.base_price - t.base_price)::NUMERIC / GREATEST(p.base_price, t.base_price, 1)::NUMERIC))
    ) AS similarity,
    cosine_similarity_jsonb(t.vector, c.vector) AS vector_similarity,
    CASE WHEN c.category_id = t.category_id THEN 1 ELSE 0 END AS category_match,
    (1 - ABS(p.base_price - t.base_price)::NUMERIC / GREATEST(p.base_price, t.base_price, 1)::NUMERIC) AS price_similarity
  FROM target t
  JOIN product_feature_vectors c ON c.product_id <> t.product_id
  JOIN products p ON p.id = c.product_id
  WHERE p.is_active = TRUE
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- --------------------------------------------------------------
-- 11) Unified refresh orchestration
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_multilayer_ranking_v3()
RETURNS TABLE(
  refreshed_products INT,
  refreshed_user_vectors INT,
  refreshed_feature_vectors INT,
  refreshed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_products INT := 0;
  v_users INT := 0;
  v_features INT := 0;
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_ranking_multilayer_v3;

  v_users := refresh_user_category_vectors();
  v_features := refresh_product_feature_vectors();

  SELECT COUNT(*) INTO v_products FROM product_ranking_multilayer_v3;

  RETURN QUERY
  SELECT v_products, v_users, v_features, NOW();
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------------------------
-- 12) Compatibility wrappers for existing endpoints
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_trending_products(limit_count INT)
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
    p.id AS product_id,
    p.name,
    p.base_price,
    COALESCE(p.average_rating, 0)::DECIMAL AS rating,
    p.image_url,
    COALESCE(r.views, 0)::INT AS views_24h,
    ROW_NUMBER() OVER (ORDER BY r.trending_score DESC)::INT AS trending_rank,
    p.slug
  FROM product_ranking_multilayer_v3 r
  JOIN products p ON p.id = r.product_id
  WHERE p.is_active = TRUE
  ORDER BY r.trending_score DESC
  LIMIT COALESCE(limit_count, 10);
END;
$$ LANGUAGE plpgsql STABLE;

-- Initial population
SELECT refresh_multilayer_ranking_v3();
