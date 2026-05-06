-- Add SEO and color definition fields to products table
-- Migration: add_product_enhancements.sql

-- Add SEO fields
ALTER TABLE products
ADD COLUMN IF NOT EXISTS meta_title VARCHAR(60),
ADD COLUMN IF NOT EXISTS meta_description VARCHAR(160),
ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
ADD COLUMN IF NOT EXISTS seo_slug VARCHAR(255);

-- Add color definitions column (JSONB array)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS color_definitions JSONB DEFAULT '[]';

-- Create index on seo_slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_seo_slug ON products(seo_slug);

-- Add comment
COMMENT ON COLUMN products.meta_title IS 'SEO meta title (60 chars max)';
COMMENT ON COLUMN products.meta_description IS 'SEO meta description (160 chars max)';
COMMENT ON COLUMN products.meta_keywords IS 'SEO keywords comma-separated';
COMMENT ON COLUMN products.seo_slug IS 'SEO-friendly URL slug (overrides default slug)';
COMMENT ON COLUMN products.color_definitions IS 'Array of color definitions with name and hex code';
