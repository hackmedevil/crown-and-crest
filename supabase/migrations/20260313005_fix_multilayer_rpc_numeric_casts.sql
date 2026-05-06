-- ==============================================================
-- FIX: Multilayer ranking RPC return type casts
-- Date: 2026-03-13
-- ==============================================================

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
    r.global_score::NUMERIC,
    r.final_score::NUMERIC,
    r.engagement_normalized::NUMERIC,
    r.sales_velocity_decay::NUMERIC,
    r.conversion_score::NUMERIC,
    r.rating_score::NUMERIC,
    r.freshness_score::NUMERIC
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
    r.trending_score::NUMERIC,
    (
      CASE
        WHEN (r.views + r.purchases) = 0 THEN 0
        ELSE r.trending_score / GREATEST(r.engagement_normalized, 0.0001)
      END
    )::NUMERIC AS trend_growth,
    r.engagement_normalized::NUMERIC
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
    r.final_score::NUMERIC,
    r.global_score::NUMERIC
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
    b.global_score::NUMERIC,
    b.user_interest_weight::NUMERIC,
    (b.global_score * b.user_interest_weight)::NUMERIC AS personal_score,
    ((0.7 * (b.global_score * b.user_interest_weight)) + (0.3 * b.global_score))::NUMERIC AS hybrid_score
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
    )::NUMERIC AS similarity,
    cosine_similarity_jsonb(t.vector, c.vector)::NUMERIC AS vector_similarity,
    (CASE WHEN c.category_id = t.category_id THEN 1 ELSE 0 END)::NUMERIC AS category_match,
    (1 - ABS(p.base_price - t.base_price)::NUMERIC / GREATEST(p.base_price, t.base_price, 1)::NUMERIC)::NUMERIC AS price_similarity
  FROM target t
  JOIN product_feature_vectors c ON c.product_id <> t.product_id
  JOIN products p ON p.id = c.product_id
  WHERE p.is_active = TRUE
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
