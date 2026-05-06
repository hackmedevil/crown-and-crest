-- Add bullet_points to products for product form save
ALTER TABLE products
ADD COLUMN IF NOT EXISTS bullet_points text[] DEFAULT '{}';
