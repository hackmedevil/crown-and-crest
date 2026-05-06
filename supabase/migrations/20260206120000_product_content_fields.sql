-- Product content fields for AI-assisted generation

ALTER TABLE products
ADD COLUMN IF NOT EXISTS short_description text,
ADD COLUMN IF NOT EXISTS bullet_points text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS fit text,
ADD COLUMN IF NOT EXISTS target_audience text;

COMMENT ON COLUMN products.short_description IS 'Short product summary for listings.';
COMMENT ON COLUMN products.bullet_points IS 'Key product bullet points.';
COMMENT ON COLUMN products.gender IS 'Target gender for product content.';
COMMENT ON COLUMN products.fit IS 'Fit profile for product content (slim/regular/relaxed/oversized).';
COMMENT ON COLUMN products.target_audience IS 'Target audience descriptor for product content.';
