-- ============================================
-- OPTIMIZE: Cart Items Table
-- ============================================
-- Fix redundancy and add missing constraints
-- 
-- Changes:
-- 1. Remove redundant product_id column (variant already has product_id)
-- 2. Add unique constraint to prevent duplicate cart entries
-- ============================================

-- 1. Drop product_id column (redundant - can get from variant)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'cart_items' 
    AND column_name = 'product_id'
  ) THEN
    -- First drop any indexes using this column
    DROP INDEX IF EXISTS idx_cart_items_product;
    
    -- Then drop the column
    ALTER TABLE cart_items DROP COLUMN product_id;
    RAISE NOTICE 'Removed redundant cart_items.product_id column';
  ELSE
    RAISE NOTICE 'Column cart_items.product_id does not exist, skipping';
  END IF;
END $$;

-- 2. Add unique constraint to prevent duplicate cart entries
-- A user should not have the same variant in their cart twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_variant_unique 
  ON cart_items(firebase_uid, variant_id);

COMMENT ON INDEX idx_cart_items_user_variant_unique IS 'Prevent duplicate cart entries for same user+variant';

-- Update table comment
COMMENT ON TABLE cart_items IS 'Shopping cart line items. Each user can have one entry per variant.';

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE 'Cart items optimization complete';
END $$;
