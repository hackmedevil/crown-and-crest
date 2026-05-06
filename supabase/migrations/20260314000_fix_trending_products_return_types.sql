-- ==============================================================
-- FIX: Get trending products v3 return type correction
-- Date: 2026-03-14
-- Issue: engagement_normalized returns numeric but function expects integer
-- ==============================================================

-- Ensure trending score columns are properly cast to NUMERIC
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
    COALESCE(r.trending_score, 0)::NUMERIC AS trending_score,
    (
      CASE
        WHEN (r.views + r.purchases) = 0 THEN 0
        ELSE COALESCE(r.trending_score, 0) / GREATEST(COALESCE(r.engagement_normalized, 0), 0.0001)
      END
    )::NUMERIC AS trend_growth,
    COALESCE(r.engagement_normalized, 0)::NUMERIC AS engagement_normalized
  FROM product_ranking_multilayer_v3 r
  ORDER BY r.trending_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
