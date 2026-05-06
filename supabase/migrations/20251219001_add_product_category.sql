-- Add category column to products table
-- This was missing from the original schema

DO $$ 
BEGIN
  -- Add category field
  BEGIN
    ALTER TABLE products ADD COLUMN category TEXT;
  EXCEPTION 
    WHEN duplicate_column THEN RAISE NOTICE 'column category already exists, skipping';
  END;
  
EXCEPTION 
  WHEN OTHERS THEN 
    RAISE NOTICE 'Error in migration: %', SQLERRM;
END $$;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- Add helpful comment
COMMENT ON COLUMN products.category IS 'Product category for organization (Shirts, T-Shirts, etc.)';
