-- Reload schema cache for new ranking tables and functions
-- This allows Supabase client to recognize the new objects

-- Force schema introspection by accessing the new tables
SELECT COUNT(*) FROM product_ranking_scores;
SELECT COUNT(*) FROM product_analytics;
SELECT COUNT(*) FROM analytics_events;

-- Verify the materialized views exist
SELECT COUNT(*) FROM product_ranking_view;
SELECT COUNT(*) FROM product_trending_view;

-- Comment to document schema refresh
COMMENT ON SCHEMA public IS 'Schema reloaded 2026-03-08 for ranking engine deployment';
