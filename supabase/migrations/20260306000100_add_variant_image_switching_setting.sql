-- Product-level flag for storefront variant media behavior
-- If true, storefront switches gallery to selected variant images
-- If false, storefront keeps default product gallery

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS enable_variant_image_switching boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN products.enable_variant_image_switching IS
  'Controls whether storefront gallery switches to selected variant image gallery';

CREATE INDEX IF NOT EXISTS idx_products_variant_image_switching
  ON products(enable_variant_image_switching);
