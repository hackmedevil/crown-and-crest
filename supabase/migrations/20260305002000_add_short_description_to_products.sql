-- Add short description field for products
ALTER TABLE IF EXISTS products
  ADD COLUMN IF NOT EXISTS short_description text;

CREATE INDEX IF NOT EXISTS idx_products_short_description
  ON products USING gin (to_tsvector('english', coalesce(short_description, '')));
