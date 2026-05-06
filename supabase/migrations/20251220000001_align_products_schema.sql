-- ============================================
-- SCHEMA ALIGNMENT: Products Table
-- ============================================
-- Align products table with PRODUCT_VARIANT_DATA_MODEL.md
-- 
-- Changes:
-- 1. Rename 'price' → 'base_price'
-- 2. Rename 'short_description' → 'description'
-- 3. Add 'images' JSONB column
-- 4. Migrate data from 'image_url' to 'images'
-- 5. Add 'tags' text array column
-- 6. Add missing indexes
-- ============================================

-- 1. Rename price → base_price
DO $$ 
BEGIN
  -- Check if column exists before renaming
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'price'
  ) THEN
    ALTER TABLE products RENAME COLUMN price TO base_price;
    RAISE NOTICE 'Renamed products.price → products.base_price';
  ELSE
    RAISE NOTICE 'Column products.price does not exist, skipping rename';
  END IF;
END $$;

-- 2. Rename short_description → description
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'short_description'
  ) THEN
    ALTER TABLE products RENAME COLUMN short_description TO description;
    RAISE NOTICE 'Renamed products.short_description → products.description';
  ELSE
    RAISE NOTICE 'Column products.short_description does not exist, skipping rename';
  END IF;
END $$;

-- 3. Add images JSONB column (for multiple images)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'images'
  ) THEN
    ALTER TABLE products ADD COLUMN images JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Added products.images JSONB column';
  ELSE
    RAISE NOTICE 'Column products.images already exists, skipping';
  END IF;
END $$;

-- 4. Migrate data from image_url to images array
DO $$ 
BEGIN
  -- Only migrate if image_url column exists and has data
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'image_url'
  ) THEN
    -- Migrate existing image URLs to images array
    UPDATE products 
    SET images = jsonb_build_array(
      jsonb_build_object(
        'url', image_url,
        'alt', name
      )
    )
    WHERE image_url IS NOT NULL 
      AND image_url != '' 
      AND (images IS NULL OR images = '[]'::jsonb);
    
    RAISE NOTICE 'Migrated image_url data to images array';
  END IF;
END $$;

-- 5. Add tags array column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE products ADD COLUMN tags text[] DEFAULT '{}';
    RAISE NOTICE 'Added products.tags array column';
  ELSE
    RAISE NOTICE 'Column products.tags already exists, skipping';
  END IF;
END $$;

-- 6. Add missing indexes
-- Full-text search index on name and description
CREATE INDEX IF NOT EXISTS idx_products_search 
  ON products USING gin(
    to_tsvector('english', name || ' ' || coalesce(description, ''))
  );

-- GIN index for tags array
CREATE INDEX IF NOT EXISTS idx_products_tags 
  ON products USING gin(tags);

-- Update column comments
COMMENT ON COLUMN products.base_price IS 'Base price in paise/cents (e.g., 2999 = ₹29.99). Can be overridden per variant.';
COMMENT ON COLUMN products.description IS 'Product description (formerly short_description)';
COMMENT ON COLUMN products.images IS 'Product images as JSONB array: [{"url": "...", "alt": "..."}]. Replaces legacy image_url field.';
COMMENT ON COLUMN products.tags IS 'Product tags for filtering and categorization';

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE 'Products schema alignment complete';
END $$;
