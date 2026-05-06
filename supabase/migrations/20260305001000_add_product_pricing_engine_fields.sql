-- Add pricing engine fields to products
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS cost_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS mrp numeric(12,2),
  ADD COLUMN IF NOT EXISTS discount_engine_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS discount_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS selling_price numeric(12,2);

ALTER TABLE IF EXISTS products
  DROP CONSTRAINT IF EXISTS products_discount_type_check;

ALTER TABLE IF EXISTS products
  ADD CONSTRAINT products_discount_type_check
  CHECK (discount_type IN ('percentage', 'fixed'));

CREATE INDEX IF NOT EXISTS idx_products_discount_engine_enabled
  ON products(discount_engine_enabled);
