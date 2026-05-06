-- ============================================
-- BASELINE DOCUMENTATION: Products Table
-- ============================================
-- This migration documents the current state of the products table
-- before schema alignment changes. The table was created through
-- incremental ALTER TABLE statements across multiple migrations.
--
-- Current State (as of 2025-12-19):
-- - Uses 'price' instead of 'base_price'
-- - Uses 'short_description' instead of 'description'
-- - Uses 'image_url' (text) instead of 'images' (jsonb)
-- - Missing 'tags' array column
-- - Has both 'is_active' and 'published' (redundant)
--
-- This is a NO-OP migration for documentation purposes only.
-- ============================================

-- Verify products table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    RAISE EXCEPTION 'Products table does not exist. Schema is in unexpected state.';
  END IF;
END $$;

-- Document current structure
COMMENT ON TABLE products IS 'Product catalog (style-level). Schema documented baseline: 2025-12-19';
COMMENT ON COLUMN products.price IS 'LEGACY: Will be renamed to base_price in next migration';
COMMENT ON COLUMN products.short_description IS 'LEGACY: Will be renamed to description in next migration';
COMMENT ON COLUMN products.image_url IS 'LEGACY: Will be migrated to images JSONB array in next migration';
