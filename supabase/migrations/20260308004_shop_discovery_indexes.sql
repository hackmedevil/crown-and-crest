-- ==============================================================
-- SHOP DISCOVERY PERFORMANCE INDEXES
-- Date: 2026-03-08
-- Purpose: Keep shop discovery queries fast at scale
-- ==============================================================

-- Products filtering and sorting
CREATE INDEX IF NOT EXISTS idx_products_category_id_shop ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_base_price_shop ON products(base_price);
CREATE INDEX IF NOT EXISTS idx_products_brand_shop ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_created_at_shop ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_category_price_shop ON products(is_active, category_id, base_price);

-- Full-text search (search_vector column needs to be created first)
-- CREATE INDEX IF NOT EXISTS idx_products_search_vector_shop ON products USING gin(search_vector);

-- Variant facets
CREATE INDEX IF NOT EXISTS idx_variants_size_shop ON variants(size);
CREATE INDEX IF NOT EXISTS idx_variants_color_shop ON variants(color);
CREATE INDEX IF NOT EXISTS idx_variants_product_id_shop ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_product_size_color_shop ON variants(product_id, size, color);

-- Ranking + analytics joins
CREATE INDEX IF NOT EXISTS idx_product_ranking_scores_ranking_shop ON product_ranking_scores(ranking_score DESC);
CREATE INDEX IF NOT EXISTS idx_product_ranking_scores_product_shop ON product_ranking_scores(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_product_shop ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_rating_shop ON product_analytics(rating DESC);

COMMENT ON INDEX idx_products_active_category_price_shop IS 'Shop discovery critical index for category + active + price filtered queries';
-- COMMENT ON INDEX idx_products_search_vector_shop IS 'Shop search GIN index for text search';
COMMENT ON INDEX idx_variants_product_size_color_shop IS 'Faceted filter lookup for size/color by product';
