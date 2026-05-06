-- Create the materialized view directly in the database
-- This bypasses the migration tracking and directly creates the view

CREATE MATERIALIZED VIEW IF NOT EXISTS product_ranking_view AS
WITH purchase_data AS (
  SELECT 
    v.product_id,
    COUNT(*) as purchase_count,
    SUM(oi.quantity) as total_quantity_sold
  FROM order_items oi
  JOIN variants v ON oi.variant_id = v.id
  GROUP BY v.product_id
),
view_data AS (
  SELECT
    product_id,
    COUNT(*) as view_count,
    COUNT(DISTINCT user_id) as unique_users_all,
    COUNT(DISTINCT session_id) as unique_sessions_all,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as views_last_7_days,
    COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN user_id END) as unique_users_7d,
    COUNT(DISTINCT CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN session_id END) as unique_sessions_7d
  FROM analytics_events
  WHERE event_type = 'view_product'
    AND created_at > NOW() - INTERVAL '90 days'
  GROUP BY product_id
),
cart_data AS (
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
  SELECT 
    id,
    name,
    category_id,
    rating,
    review_count,
    created_at,
    base_price,
    stock_quantity
  FROM products
  WHERE is_active = true
)
SELECT
  p.id as product_id,
  p.name,
  p.category_id,
  COALESCE(pur.purchase_count, 0) as purchase_count,
  COALESCE(v.view_count, 0) as view_count,
  COALESCE(c.add_to_cart_count, 0) as add_to_cart_count,
  COALESCE(v.unique_users_all, 0) as unique_user_views,
  COALESCE(v.unique_sessions_all, 0) as unique_session_views,
  CASE
    WHEN COALESCE(v.unique_users_all, 0) > 0 
    THEN ROUND((COALESCE(pur.purchase_count, 0)::DECIMAL / v.unique_users_all), 4)
    ELSE 0
  END as conversion_rate,
  ROUND(COALESCE(p.rating, 0) * COALESCE(p.review_count, 0), 2) as rating_score,
  CASE
    WHEN p.stock_quantity <= 0 THEN -100
    ELSE 1
  END as stock_score,
  ROUND(COALESCE(c.add_to_cart_count, 0) * 3, 2) as cart_score,
  ROUND(30.0 / (EXTRACT(DAY FROM (NOW() - p.created_at))::INT + 1), 2) as recency_decay_boost,
  CASE
    WHEN COALESCE(pur.purchase_count, 0) >= 100 THEN 20
    WHEN COALESCE(pur.purchase_count, 0) >= 50 THEN 15
    WHEN COALESCE(pur.purchase_count, 0) >= 25 THEN 10
    WHEN COALESCE(pur.purchase_count, 0) >= 10 THEN 5
    ELSE 0
  END as bestseller_boost,
  ROUND(
    (COALESCE(pur.purchase_count, 0) * 5) +
    (COALESCE(v.unique_users_all, 0) * 2) +
    (COALESCE(c.add_to_cart_count, 0) * 3) +
    (CASE
      WHEN COALESCE(v.unique_users_all, 0) > 0 
      THEN (COALESCE(pur.purchase_count, 0)::DECIMAL / v.unique_users_all) * 10
      ELSE 0
    END) +
    (COALESCE(p.rating, 0) * COALESCE(p.review_count, 0) * 1.5) +
    (30.0 / (EXTRACT(DAY FROM (NOW() - p.created_at))::INT + 1)) +
    (CASE
      WHEN p.stock_quantity <= 0 THEN -100
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
ORDER BY ranking_score DESC;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ranking_view_id ON product_ranking_view(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ranking_view_score ON product_ranking_view(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_ranking_view_category ON product_ranking_view(category_id);

-- Trending view
CREATE MATERIALIZED VIEW IF NOT EXISTS product_trending_view AS
SELECT
  p.id as product_id,
  p.name,
  p.category_id,
  COUNT(*) as views_last_24h,
  COALESCE(pa.orders_count, 0) as total_orders,
  COALESCE(p.rating, 0) as rating,
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
GROUP BY p.id, p.name, p.category_id, pa.orders_count, p.rating, p.base_price, p.image_url
ORDER BY views_last_24h DESC
LIMIT 100;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_view_product_id ON product_trending_view(product_id);
CREATE INDEX IF NOT EXISTS idx_trending_view_rank ON product_trending_view(trending_rank);

-- Refresh the views to populate them
REFRESH MATERIALIZED VIEW CONCURRENTLY product_ranking_view;
REFRESH MATERIALIZED VIEW CONCURRENTLY product_trending_view;

-- Verify the views exist
SELECT 'product_ranking_view' as view_name, COUNT(*) as row_count FROM product_ranking_view
UNION ALL
SELECT 'product_trending_view' as view_name, COUNT(*) as row_count FROM product_trending_view;
