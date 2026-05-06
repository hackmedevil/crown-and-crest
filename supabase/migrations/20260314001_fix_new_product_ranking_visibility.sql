-- ==============================================================
-- FIX: New products not appearing in category / shop pages
-- Date: 2026-03-14
--
-- Root cause: When a product is created, no row is inserted into
-- product_ranking_scores. The shop/category discovery APIs sort by
-- ranking_score DESC (via PostgREST foreignTable ordering), which
-- pushes products with a NULL score to the very last position.
-- On a store with many products this means newly added products
-- never appear on page 1.
--
-- Fix:
--  1. Trigger: auto-create an initial product_ranking_scores row
--     on INSERT into products (fires for every new product).
--  2. Trigger: re-seed score when is_active flips false → true
--     (covers the "set product active" admin action).
--  3. Backfill: one-time INSERT for any active product that still
--     has no ranking row (catches products created before this fix).
--  4. Fix refresh_product_ranking_scores() to REFRESH the
--     materialized view first, then use UPSERT so new products
--     created between refreshes keep their initial score.
-- ==============================================================


-- ----------------------------------------------------------------
-- 1) Trigger function – seed initial ranking score
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_seed_initial_ranking_score()
RETURNS TRIGGER AS $$
DECLARE
  v_days_old   INT;
  v_recency    DECIMAL(10,2);
  v_init_score DECIMAL(12,2);
BEGIN
  -- Only act when the product is (or becomes) active
  IF NEW.is_active IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- On UPDATE, only act when is_active flipped from FALSE to TRUE
  IF TG_OP = 'UPDATE' AND (OLD.is_active IS TRUE) THEN
    RETURN NEW;
  END IF;

  v_days_old := GREATEST(
    EXTRACT(DAY FROM (NOW() - NEW.created_at))::INT,
    0
  );
  -- recency_decay_boost formula: 30 / (days_old + 1)
  v_recency   := ROUND(30.0 / (v_days_old + 1), 2);
  -- Initial composite score = recency_boost + stock_score(1)
  v_init_score := v_recency + 1;

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
    last_updated,
    updated_at
  ) VALUES (
    NEW.id,
    0,           -- purchase_count
    0,           -- view_count
    0,           -- add_to_cart_count
    0,           -- unique_user_views
    0,           -- unique_session_views
    0,           -- conversion_rate
    0,           -- rating_score
    1,           -- stock_score  (assume in-stock until first ranking refresh)
    0,           -- cart_score
    v_recency,   -- recency_decay_boost
    0,           -- bestseller_boost
    v_init_score,
    NOW(),
    NOW()
  )
  ON CONFLICT (product_id) DO NOTHING;  -- never overwrite a real score

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------
-- 2) DROP old triggers (idempotent) then CREATE
-- ----------------------------------------------------------------

-- After INSERT: every new product
DROP TRIGGER IF EXISTS trg_seed_ranking_on_insert ON products;
CREATE TRIGGER trg_seed_ranking_on_insert
  AFTER INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_seed_initial_ranking_score();

-- After UPDATE: when is_active is set to TRUE
DROP TRIGGER IF EXISTS trg_seed_ranking_on_activate ON products;
CREATE TRIGGER trg_seed_ranking_on_activate
  AFTER UPDATE OF is_active ON products
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE AND OLD.is_active IS DISTINCT FROM TRUE)
  EXECUTE FUNCTION fn_seed_initial_ranking_score();


-- ----------------------------------------------------------------
-- 3) Backfill: give initial scores to already-active products that
--    have no ranking row (e.g. products created before this fix)
-- ----------------------------------------------------------------
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
  last_updated,
  updated_at
)
SELECT
  p.id,
  0, 0, 0, 0, 0,
  0, 0,
  1,  -- stock_score
  0,  -- cart_score
  ROUND(30.0 / (GREATEST(EXTRACT(DAY FROM (NOW() - p.created_at))::INT, 0) + 1), 2),
  0,  -- bestseller_boost
  -- composite: recency + stock_score
  ROUND(1 + 30.0 / (GREATEST(EXTRACT(DAY FROM (NOW() - p.created_at))::INT, 0) + 1), 2),
  NOW(),
  NOW()
FROM products p
WHERE p.is_active = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM product_ranking_scores prs WHERE prs.product_id = p.id
  );


-- ----------------------------------------------------------------
-- 4) Fix refresh_product_ranking_scores():
--    • REFRESH the materialized view first so new products are
--      included in the view.
--    • Use UPSERT (ON CONFLICT DO UPDATE) instead of DELETE+INSERT
--      so products created between refreshes keep their row.
--    • Also remove scores for products that are no longer active.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_product_ranking_scores()
RETURNS TABLE(refreshed_count INT, last_updated TIMESTAMPTZ) AS $$
DECLARE
  v_count        INT;
  v_last_updated TIMESTAMPTZ;
BEGIN
  v_last_updated := NOW();

  -- Refresh the materialized view so it includes any products
  -- added since the last refresh.
  REFRESH MATERIALIZED VIEW CONCURRENTLY product_ranking_view;

  -- Upsert: update existing rows, leave new-product seed rows
  -- alone only if they don't exist in the view yet.
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
    last_updated,
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
    v_last_updated,
    v_last_updated
  FROM product_ranking_view prv
  ON CONFLICT (product_id) DO UPDATE SET
    purchase_count       = EXCLUDED.purchase_count,
    view_count           = EXCLUDED.view_count,
    add_to_cart_count    = EXCLUDED.add_to_cart_count,
    unique_user_views    = EXCLUDED.unique_user_views,
    unique_session_views = EXCLUDED.unique_session_views,
    conversion_rate      = EXCLUDED.conversion_rate,
    rating_score         = EXCLUDED.rating_score,
    stock_score          = EXCLUDED.stock_score,
    cart_score           = EXCLUDED.cart_score,
    recency_decay_boost  = EXCLUDED.recency_decay_boost,
    bestseller_boost     = EXCLUDED.bestseller_boost,
    ranking_score        = EXCLUDED.ranking_score,
    last_updated         = EXCLUDED.last_updated,
    updated_at           = EXCLUDED.updated_at;

  -- Remove stale rows for products that are no longer active / deleted
  DELETE FROM product_ranking_scores
  WHERE product_id NOT IN (
    SELECT id FROM products WHERE is_active = TRUE
  );

  SELECT COUNT(*) INTO v_count FROM product_ranking_scores;

  RETURN QUERY SELECT v_count, v_last_updated;
END;
$$ LANGUAGE plpgsql;
