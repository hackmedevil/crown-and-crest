-- ============================================================== 
-- FBT v3 integration with ranking engine
-- Date: 2026-03-13
-- Purpose: Blend co-purchase strength with ranking and similarity
-- ==============================================================

CREATE OR REPLACE FUNCTION get_frequently_bought_together_v3(
  p_product_id UUID,
  p_limit INT DEFAULT 4
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  slug TEXT,
  base_price INTEGER,
  image_url TEXT,
  frequency INTEGER,
  recommendation_score NUMERIC,
  recommended_variant_id UUID
) AS $$
BEGIN
  RETURN QUERY
  WITH anchor AS (
    SELECT pfv.vector AS anchor_vector
    FROM product_feature_vectors pfv
    WHERE pfv.product_id = p_product_id
    LIMIT 1
  ),
  combos AS (
    SELECT
      pc.frequently_bought_with_id AS product_id,
      pc.frequency
    FROM product_combinations pc
    WHERE pc.product_id = p_product_id
      AND pc.frequency > 0
  ),
  combo_count AS (
    SELECT COUNT(*)::INT AS total FROM combos
  ),
  ranked_candidates AS (
    SELECT
      c.product_id,
      c.frequency,
      COALESCE(r.final_score, 0)::NUMERIC AS final_score,
      COALESCE(cosine_similarity_jsonb(a.anchor_vector, pfv.vector), 0)::NUMERIC AS vector_similarity
    FROM combos c
    LEFT JOIN product_ranking_multilayer_v3 r ON r.product_id = c.product_id
    LEFT JOIN product_feature_vectors pfv ON pfv.product_id = c.product_id
    LEFT JOIN anchor a ON TRUE
  ),
  normalized_candidates AS (
    SELECT
      rc.*,
      CASE
        WHEN MAX(rc.frequency) OVER () = 0 THEN 0
        ELSE rc.frequency::NUMERIC / MAX(rc.frequency) OVER ()::NUMERIC
      END AS combo_signal,
      CASE
        WHEN MAX(rc.final_score) OVER () = 0 THEN 0
        ELSE rc.final_score / MAX(rc.final_score) OVER ()
      END AS ranking_signal
    FROM ranked_candidates rc
  ),
  combo_results AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.base_price,
      p.image_url,
      nc.frequency,
      (
        (0.55 * nc.combo_signal)
        + (0.30 * nc.ranking_signal)
        + (0.15 * nc.vector_similarity)
      )::NUMERIC AS recommendation_score,
      (
        SELECT v.id
        FROM variants v
        WHERE v.product_id = p.id
          AND COALESCE(v.stock_quantity, 0) > 0
        ORDER BY v.stock_quantity DESC, v.created_at ASC
        LIMIT 1
      ) AS recommended_variant_id
    FROM normalized_candidates nc
    JOIN products p ON p.id = nc.product_id
    WHERE p.is_active = TRUE
    ORDER BY recommendation_score DESC
    LIMIT p_limit
  ),
  fallback_results AS (
    SELECT
      p.id,
      p.name,
      p.slug,
      p.base_price,
      p.image_url,
      0::INT AS frequency,
      COALESCE(s.similarity, 0)::NUMERIC AS recommendation_score,
      (
        SELECT v.id
        FROM variants v
        WHERE v.product_id = p.id
          AND COALESCE(v.stock_quantity, 0) > 0
        ORDER BY v.stock_quantity DESC, v.created_at ASC
        LIMIT 1
      ) AS recommended_variant_id
    FROM get_similar_products_v3(p_product_id, p_limit) s
    JOIN products p ON p.id = s.product_id
    WHERE p.is_active = TRUE
    ORDER BY s.similarity DESC
    LIMIT p_limit
  )
  SELECT cr.*
  FROM combo_results cr
  WHERE (SELECT total FROM combo_count) > 0

  UNION ALL

  SELECT fr.*
  FROM fallback_results fr
  WHERE (SELECT total FROM combo_count) = 0

  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
