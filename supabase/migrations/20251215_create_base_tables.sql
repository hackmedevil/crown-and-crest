-- Add missing columns to existing products table and ensure variants table exists

-- 1) Add missing columns to products if they don't exist
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description text;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title text;
  ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create indexes safely
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = true;

-- 2) Variants table - create if not exists
CREATE TABLE IF NOT EXISTS variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  size text,
  color text,
  price_override integer,
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer DEFAULT 5,
  is_enabled boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT variants_stock_non_negative CHECK (stock_quantity >= 0),
  CONSTRAINT variants_price_override_positive CHECK (price_override IS NULL OR price_override > 0)
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_is_enabled ON variants(is_enabled);
CREATE INDEX IF NOT EXISTS idx_variants_product_enabled ON variants(product_id, is_enabled);
