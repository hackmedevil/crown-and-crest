-- Extend Products Table: Add Metadata for Badges, Ranking, and Analytics
-- Created: 2026-03-08
-- Purpose: Add fields required by storefront UI for product badges, sorting, and analytics

-- ==============================================================================
-- TASK 1: Add Metadata Columns
-- ==============================================================================

-- Add badge-related columns
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN products.is_new IS 'Badge: Shows "New" label on product cards';
COMMENT ON COLUMN products.is_bestseller IS 'Badge: Shows "Bestseller" label and enables bestseller sorting';
COMMENT ON COLUMN products.is_on_sale IS 'Badge: Shows "Sale" label on discounted products';

-- Add analytics columns
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wishlist_count INTEGER DEFAULT 0;

COMMENT ON COLUMN products.view_count IS 'Analytics: Number of product detail page views';
COMMENT ON COLUMN products.purchase_count IS 'Analytics: Number of completed purchases';
COMMENT ON COLUMN products.wishlist_count IS 'Analytics: Number of times added to wishlist';

-- Add ranking column
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS ranking_score NUMERIC DEFAULT 0;

COMMENT ON COLUMN products.ranking_score IS 'Computed score for product ranking (used in popularity sorting)';

-- ==============================================================================
-- TASK 2: Add Performance Indexes
-- ==============================================================================

-- Index for category filtering (shop page)
CREATE INDEX IF NOT EXISTS idx_products_category_filter 
  ON products(category_id)
  WHERE status = 'active';

-- Index for price range filtering and sorting
CREATE INDEX IF NOT EXISTS idx_products_price 
  ON products(base_price)
  WHERE status = 'active';

-- Index for popularity sorting (most important - used frequently)
CREATE INDEX IF NOT EXISTS idx_products_ranking 
  ON products(ranking_score DESC)
  WHERE status = 'active';

-- Index for newest sorting
CREATE INDEX IF NOT EXISTS idx_products_newest 
  ON products(created_at DESC)
  WHERE status = 'active';

-- Composite index for bestseller filtering + sorting
CREATE INDEX IF NOT EXISTS idx_products_bestseller 
  ON products(is_bestseller, ranking_score DESC)
  WHERE status = 'active' AND is_bestseller = TRUE;

-- Composite index for new products filtering + sorting
CREATE INDEX IF NOT EXISTS idx_products_new 
  ON products(is_new, created_at DESC)
  WHERE status = 'active' AND is_new = TRUE;

-- Composite index for sale products filtering + sorting
CREATE INDEX IF NOT EXISTS idx_products_sale 
  ON products(is_on_sale, base_price)
  WHERE status = 'active' AND is_on_sale = TRUE;

-- ==============================================================================
-- TASK 3: Add Constraints and Triggers
-- ==============================================================================

-- Ensure analytics columns are never negative
ALTER TABLE products 
  ADD CONSTRAINT chk_view_count_positive CHECK (view_count >= 0);

ALTER TABLE products 
  ADD CONSTRAINT chk_purchase_count_positive CHECK (purchase_count >= 0);

ALTER TABLE products 
  ADD CONSTRAINT chk_wishlist_count_positive CHECK (wishlist_count >= 0);

ALTER TABLE products 
  ADD CONSTRAINT chk_ranking_score_range CHECK (ranking_score >= 0 AND ranking_score <= 1000);

-- ==============================================================================
-- Update existing products with sensible defaults
-- ==============================================================================

-- Mark recently added products as "new" (last 30 days)
UPDATE products 
SET is_new = TRUE 
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND status = 'active';

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- Query 1: Verify all new columns exist
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(col)
  INTO missing_columns
  FROM (
    SELECT unnest(ARRAY['is_new', 'is_bestseller', 'is_on_sale', 'view_count', 'purchase_count', 'wishlist_count', 'ranking_score']) AS col
    EXCEPT
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products'
  ) missing;

  IF missing_columns IS NOT NULL THEN
    RAISE EXCEPTION 'Missing columns: %', missing_columns;
  ELSE
    RAISE NOTICE '✅ All metadata columns added successfully';
  END IF;
END $$;

-- Query 2: Verify all indexes exist
DO $$
DECLARE
  expected_indexes TEXT[] := ARRAY[
    'idx_products_category_filter',
    'idx_products_price',
    'idx_products_ranking',
    'idx_products_newest',
    'idx_products_bestseller',
    'idx_products_new',
    'idx_products_sale'
  ];
  missing_indexes TEXT[];
BEGIN
  SELECT ARRAY_AGG(idx)
  INTO missing_indexes
  FROM (
    SELECT unnest(expected_indexes) AS idx
    EXCEPT
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'products'
  ) missing;

  IF missing_indexes IS NOT NULL THEN
    RAISE WARNING 'Missing indexes: %', missing_indexes;
  ELSE
    RAISE NOTICE '✅ All performance indexes created successfully';
  END IF;
END $$;

-- Query 3: Count products with new metadata
DO $$
DECLARE
  new_count INTEGER;
  bestseller_count INTEGER;
  sale_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO new_count FROM products WHERE is_new = TRUE;
  SELECT COUNT(*) INTO bestseller_count FROM products WHERE is_bestseller = TRUE;
  SELECT COUNT(*) INTO sale_count FROM products WHERE is_on_sale = TRUE;

  RAISE NOTICE '✅ Products marked as new: %', new_count;
  RAISE NOTICE '✅ Products marked as bestseller: %', bestseller_count;
  RAISE NOTICE '✅ Products marked as sale: %', sale_count;
END $$;

-- Query 4: Show sample products with metadata
DO $$
DECLARE
  sample_record RECORD;
BEGIN
  RAISE NOTICE '✅ Sample products with metadata:';
  FOR sample_record IN 
    SELECT name, is_new, is_bestseller, is_on_sale, view_count, ranking_score 
    FROM products 
    WHERE status = 'active'
    LIMIT 5
  LOOP
    RAISE NOTICE '  - % | New: % | Bestseller: % | Sale: % | Views: % | Score: %', 
      sample_record.name, 
      sample_record.is_new, 
      sample_record.is_bestseller, 
      sample_record.is_on_sale, 
      sample_record.view_count, 
      sample_record.ranking_score;
  END LOOP;
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

-- Final summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Added columns:';
  RAISE NOTICE '  - is_new (BOOLEAN)';
  RAISE NOTICE '  - is_bestseller (BOOLEAN)';
  RAISE NOTICE '  - is_on_sale (BOOLEAN)';
  RAISE NOTICE '  - view_count (INTEGER)';
  RAISE NOTICE '  - purchase_count (INTEGER)';
  RAISE NOTICE '  - wishlist_count (INTEGER)';
  RAISE NOTICE '  - ranking_score (NUMERIC)';
  RAISE NOTICE '';
  RAISE NOTICE 'Added indexes:';
  RAISE NOTICE '  - idx_products_category_filter';
  RAISE NOTICE '  - idx_products_price';
  RAISE NOTICE '  - idx_products_ranking';
  RAISE NOTICE '  - idx_products_newest';
  RAISE NOTICE '  - idx_products_bestseller';
  RAISE NOTICE '  - idx_products_new';
  RAISE NOTICE '  - idx_products_sale';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Safe for production (no data loss)';
  RAISE NOTICE '========================================';
END $$;
