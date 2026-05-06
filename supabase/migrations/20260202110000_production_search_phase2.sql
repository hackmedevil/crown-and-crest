-- Production AI Search - Phase 2: User Behavior Learning
-- Tracks user interactions with search results for intelligent ranking

-- 1. Search Interactions Table
CREATE TABLE IF NOT EXISTS search_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  interaction_type text NOT NULL CHECK (interaction_type IN ('view', 'click', 'cart_add', 'purchase')),
  search_result_position int, -- Position in search results (1-indexed)
  similarity_score float, -- AI similarity score for this result
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for analytics and ranking queries
CREATE INDEX IF NOT EXISTS search_interactions_query_idx ON search_interactions(search_query);
CREATE INDEX IF NOT EXISTS search_interactions_product_idx ON search_interactions(product_id);
CREATE INDEX IF NOT EXISTS search_interactions_type_idx ON search_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS search_interactions_created_at_idx ON search_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS search_interactions_user_idx ON search_interactions(user_id) WHERE user_id IS NOT NULL;

-- 2. Materialized view for popular search-product pairs (updated daily)
CREATE MATERIALIZED VIEW IF NOT EXISTS search_product_popularity AS
SELECT 
  search_query,
  product_id,
  COUNT(*) FILTER (WHERE interaction_type = 'click') as click_count,
  COUNT(*) FILTER (WHERE interaction_type = 'cart_add') as cart_add_count,
  COUNT(*) FILTER (WHERE interaction_type = 'purchase') as purchase_count,
  AVG(search_result_position) as avg_position,
  COUNT(*) as total_interactions
FROM search_interactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY search_query, product_id
HAVING COUNT(*) >= 2; -- At least 2 interactions to be meaningful

CREATE UNIQUE INDEX IF NOT EXISTS search_product_popularity_idx 
ON search_product_popularity(search_query, product_id);

-- 3. Function to calculate behavior boost score
CREATE OR REPLACE FUNCTION calculate_behavior_boost(
  p_search_query text,
  p_product_id uuid
) RETURNS float AS $$
DECLARE
  boost_score float := 0;
  click_boost float := 0.1;
  cart_boost float := 0.15;
  purchase_boost float := 0.2;
BEGIN
  -- Get interaction counts for this search-product pair
  SELECT 
    LEAST(click_count * click_boost, 0.2) +
    LEAST(cart_add_count * cart_boost, 0.2) +
    LEAST(purchase_count * purchase_boost, 0.3)
  INTO boost_score
  FROM search_product_popularity
  WHERE search_query = p_search_query
    AND product_id = p_product_id;
  
  RETURN COALESCE(boost_score, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON TABLE search_interactions IS 'Tracks all user interactions with search results for learning and ranking improvement';
COMMENT ON MATERIALIZED VIEW search_product_popularity IS 'Pre-computed popularity scores for search-product pairs (refreshed daily)';
COMMENT ON FUNCTION calculate_behavior_boost IS 'Calculates ranking boost based on user behavior (0-0.7 scale)';
