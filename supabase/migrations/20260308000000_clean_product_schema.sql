-- Product Page Architecture Refactor: Schema Cleanup & Performance Indexes
-- Created: 2026-03-08
-- Purpose: Add performance indexes for PDP queries and mark legacy fields as deprecated

-- Mark legacy fields as deprecated (will migrate data and remove in future version)
COMMENT ON COLUMN products.image_url IS 'DEPRECATED: Use product_images table instead. To be removed in v2.0';
COMMENT ON COLUMN products.images IS 'DEPRECATED: Use product_images table instead. To be removed in v2.0';

-- Add performance indexes for PDP queries
-- These optimize variant fetching by color group and product
CREATE INDEX IF NOT EXISTS idx_variants_color_group_id 
  ON variants(color_group_id) 
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_variants_product_enabled 
  ON variants(product_id, enabled) 
  WHERE enabled = true;

-- Optimize color group image fetching
CREATE INDEX IF NOT EXISTS idx_color_group_images_position 
  ON color_group_images(color_group_id, position);

-- Optimize variant image fetching
CREATE INDEX IF NOT EXISTS idx_variant_images_position 
  ON variant_images(variant_id, position);

-- Add composite index for variant matching (color + size lookup)
CREATE INDEX IF NOT EXISTS idx_variants_product_color_size 
  ON variants(product_id, color_group_id, size) 
  WHERE enabled = true;

-- Ensure category_id is indexed for related products query
CREATE INDEX IF NOT EXISTS idx_products_category_id 
  ON products(category_id) 
  WHERE status = 'active';

-- Add product_images indexes if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_images') THEN
    CREATE INDEX IF NOT EXISTS idx_product_images_position 
      ON product_images(product_id, position);
  END IF;
END $$;

-- Add index for product status + slug (used by PDP main query)
CREATE INDEX IF NOT EXISTS idx_products_status_slug 
  ON products(status, slug);

-- Add index for enabled variants join optimization
CREATE INDEX IF NOT EXISTS idx_variants_enabled 
  ON variants(enabled) 
  WHERE enabled = true;

-- Performance comment
COMMENT ON INDEX idx_variants_product_color_size IS 'Optimizes variant lookup by product + color group + size for PDP selector';
COMMENT ON INDEX idx_variants_product_enabled IS 'Optimizes enabled variants filtering in product queries';
COMMENT ON INDEX idx_products_category_id IS 'Optimizes related products lookup by category';
