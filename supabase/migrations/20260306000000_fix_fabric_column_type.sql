-- Fix fabric column type from text[] to text
-- Migration: 20260306000000_fix_fabric_column_type
-- Issue: fabric was created as array but should be a single text field

-- Convert existing array data to single text value (take first element or null)
UPDATE products
SET fabric = CASE 
  WHEN fabric IS NOT NULL AND array_length(fabric, 1) > 0 
  THEN fabric[1]::text
  ELSE NULL
END::text[]
WHERE fabric IS NOT NULL;

-- Drop the existing fabric column (it's an array)
ALTER TABLE products DROP COLUMN IF EXISTS fabric;

-- Re-add fabric as a single text column
ALTER TABLE products ADD COLUMN fabric text;

-- Update the comment
COMMENT ON COLUMN products.fabric IS 'Fabric material (e.g., Cotton, Polyester, Cotton Blend)';

-- Recreate the index if it existed
CREATE INDEX IF NOT EXISTS idx_products_fabric ON products(fabric) WHERE fabric IS NOT NULL;
