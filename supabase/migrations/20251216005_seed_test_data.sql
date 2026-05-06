-- Test data for development

-- Insert test product for 'test-product'
INSERT INTO products (id, name, slug, short_description, price, image_url, is_active, created_at)
VALUES (
  'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'::uuid,
  'Test Product',
  'test-product',
  'This is a test product for development',
  2999,
  'https://via.placeholder.com/400',
  true,
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- Test product media for test-product
INSERT INTO product_media (id, product_id, cloudinary_public_id, resource_type, width, height, aspect_ratio, alt_text, position, is_primary, is_active, created_at)
VALUES (
  'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7'::uuid,
  'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'::uuid,
  'sample',
  'image',
  1200,
  1200,
  1.0,
  'Primary product image',
  0,
  true,
  true,
  now()
)
ON CONFLICT DO NOTHING;

-- Insert test variant for test-product
INSERT INTO variants (id, product_id, sku, size, color, stock_quantity, low_stock_threshold, is_enabled, position, created_at)
VALUES (
  'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8'::uuid,
  'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'::uuid,
  'TEST-001-M',
  'M',
  'Black',
  100,
  10,
  true,
  0,
  now()
)
ON CONFLICT (sku) DO NOTHING;

-- Insert test variant media for test-product variant
INSERT INTO variant_media (id, variant_id, cloudinary_public_id, resource_type, width, height, aspect_ratio, alt_text, position, is_primary, is_active, created_at)
VALUES (
  'd4e5f6a7-b8c9-40d1-e2f3-a4b5c6d7e8f9'::uuid,
  'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8'::uuid,
  'sample',
  'image',
  1200,
  1200,
  1.0,
  'Variant image',
  0,
  true,
  true,
  now()
)
ON CONFLICT DO NOTHING;

-- Add product media to existing 'oversized-black-tee' product
-- First, find the product and add media to it if it doesn't have any
INSERT INTO product_media (id, product_id, cloudinary_public_id, resource_type, width, height, aspect_ratio, alt_text, position, is_primary, is_active, created_at)
SELECT 
  gen_random_uuid(),
  products.id,
  'sample',
  'image'::media_resource_type,
  1200,
  1200,
  1.0,
  'Oversized Black Tee Front',
  0,
  true,
  true,
  now()
FROM products
WHERE products.slug = 'oversized-black-tee'
AND NOT EXISTS (
  SELECT 1 FROM product_media WHERE product_media.product_id = products.id
)
ON CONFLICT DO NOTHING;
