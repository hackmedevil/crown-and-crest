-- Add Shiprocket-ready fields to products table
-- Migration: Add weight and dimensions for shipping

DO $$ 
BEGIN
  -- Add weight in grams for Shiprocket
  BEGIN
    ALTER TABLE products ADD COLUMN weight_grams INTEGER;
  EXCEPTION 
    WHEN duplicate_column THEN RAISE NOTICE 'column weight_grams already exists, skipping';
  END;

  -- Add dimensions as JSONB for flexible storage
  BEGIN
    ALTER TABLE products ADD COLUMN dimensions_json JSONB;
  EXCEPTION 
    WHEN duplicate_column THEN RAISE NOTICE 'column dimensions_json already exists, skipping';
  END;

  -- Add constraints
  BEGIN
    ALTER TABLE products ADD CONSTRAINT products_weight_positive CHECK (weight_grams IS NULL OR weight_grams > 0);
  EXCEPTION 
    WHEN duplicate_object THEN RAISE NOTICE 'constraint products_weight_positive already exists, skipping';
  END;

EXCEPTION 
  WHEN OTHERS THEN 
    RAISE NOTICE 'Error in migration: %', SQLERRM;
END $$;

-- Create index for Shiprocket queries
CREATE INDEX IF NOT EXISTS idx_products_weight ON products(weight_grams) WHERE weight_grams IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN products.weight_grams IS 'Product weight in grams for shipping calculations';
COMMENT ON COLUMN products.dimensions_json IS 'Product dimensions in cm: {length, width, height}';
