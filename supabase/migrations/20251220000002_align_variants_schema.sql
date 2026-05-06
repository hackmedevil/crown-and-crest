-- ============================================
-- SCHEMA ALIGNMENT: Variants Table
-- ============================================
-- Align variants table with PRODUCT_VARIANT_DATA_MODEL.md
-- 
-- Changes:
-- 1. Rename 'is_enabled' → 'enabled'
-- 2. Add 'images' JSONB column for variant-specific images
-- 3. Add unique constraint on (product_id, size, color)
-- 4. Add low stock index
-- ============================================

-- 1. Rename is_enabled → enabled
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'variants' 
    AND column_name = 'is_enabled'
  ) THEN
    ALTER TABLE variants RENAME COLUMN is_enabled TO enabled;
    RAISE NOTICE 'Renamed variants.is_enabled → variants.enabled';
  ELSE
    RAISE NOTICE 'Column variants.is_enabled does not exist, skipping rename';
  END IF;
END $$;

-- 2. Add images JSONB column for variant-specific images
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'variants' 
    AND column_name = 'images'
  ) THEN
    ALTER TABLE variants ADD COLUMN images JSONB;
    RAISE NOTICE 'Added variants.images JSONB column';
  ELSE
    RAISE NOTICE 'Column variants.images already exists, skipping';
  END IF;
END $$;

-- 3. Add unique constraint on (product_id, size, color) combination
-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_variants_unique_combo;

-- Create unique index (handle NULL colors with COALESCE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_variants_unique_combo 
  ON variants(product_id, size, COALESCE(color, ''));

COMMENT ON INDEX idx_variants_unique_combo IS 'Ensure one variant per product+size+color combination';

-- 4. Add low stock index for admin alerts
CREATE INDEX IF NOT EXISTS idx_variants_low_stock 
  ON variants(stock_quantity) 
  WHERE stock_quantity <= low_stock_threshold AND enabled = true;

COMMENT ON INDEX idx_variants_low_stock IS 'Quick lookup for variants needing restock';

-- Update column comments
COMMENT ON COLUMN variants.enabled IS 'Enable/disable variant without deletion (formerly is_enabled)';
COMMENT ON COLUMN variants.images IS 'Variant-specific images (e.g., color swatches): [{"url": "...", "alt": "..."}]';
COMMENT ON COLUMN variants.position IS 'Display order for variant selection UI';

-- Update existing indexes to reference 'enabled' instead of 'is_enabled'
-- Drop old indexes
DROP INDEX IF EXISTS idx_variants_is_enabled;
DROP INDEX IF EXISTS idx_variants_product_enabled;

-- Recreate with new column name
CREATE INDEX IF NOT EXISTS idx_variants_enabled 
  ON variants(enabled) 
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_variants_product_enabled 
  ON variants(product_id, enabled);

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE 'Variants schema alignment complete';
END $$;
