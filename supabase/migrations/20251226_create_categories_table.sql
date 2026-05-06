-- ============================================
-- CATEGORIES SYSTEM - STRUCTURED MANAGEMENT
-- ============================================
-- Purpose: Move from free-text category to structured categories table
-- Enables: SEO, hierarchy, metadata, proper navigation
-- Per D2C Fashion Specification
-- ============================================

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,  -- For hierarchy (Men > Shirts)
  description TEXT,
  image_url TEXT,
  meta_title VARCHAR(60),
  meta_description VARCHAR(160),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_category_name UNIQUE(name)
);

-- Indexes for categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_position ON categories(position);

-- ============================================
-- MIGRATE EXISTING FREE-TEXT CATEGORIES
-- ============================================

-- Insert unique categories from existing products
INSERT INTO categories (name, slug, is_active, position)
SELECT DISTINCT 
  category as name,
  LOWER(REPLACE(REPLACE(category, ' ', '-'), '&', 'and')) as slug,
  true as is_active,
  ROW_NUMBER() OVER (ORDER BY category) as position
FROM products
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ADD CATEGORY_ID TO PRODUCTS
-- ============================================

-- Add new column (keep old category for safety during migration)
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Update products to use category_id based on category name match
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category = c.name AND p.category_id IS NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Public can view active categories
DROP POLICY IF EXISTS "Public can view active categories" ON categories;
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Admins can manage all categories
DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY "Admins can manage categories"
        ON categories FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_uid = auth.uid() AND role = 'admin'
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================
-- UPDATE TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: GET CATEGORY HIERARCHY
-- ============================================

-- Recursive function to get category tree
CREATE OR REPLACE FUNCTION get_category_hierarchy()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  slug VARCHAR,
  parent_id UUID,
  level INTEGER,
  full_path TEXT
) AS $$
WITH RECURSIVE category_tree AS (
  -- Base case: root categories (no parent)
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    0 as level,
    c.name::TEXT as full_path
  FROM categories c
  WHERE c.parent_id IS NULL AND c.is_active = true
  
  UNION ALL
  
  -- Recursive case: child categories
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.parent_id,
    ct.level + 1,
    ct.full_path || ' > ' || c.name
  FROM categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
  WHERE c.is_active = true
)
SELECT * FROM category_tree ORDER BY full_path;
$$ LANGUAGE sql STABLE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE categories IS 'Structured category management with hierarchy support';
COMMENT ON COLUMN categories.parent_id IS 'Parent category ID for hierarchy (e.g., Shirts > Men)';
COMMENT ON COLUMN categories.slug IS 'SEO-friendly URL slug (e.g., mens-shirts)';
COMMENT ON COLUMN categories.meta_title IS 'SEO meta title (60 chars max)';
COMMENT ON COLUMN categories.meta_description IS 'SEO meta description (160 chars max)';

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- After verifying category_id is populated correctly, you can optionally:
-- 1. Make category_id NOT NULL: ALTER TABLE products ALTER COLUMN category_id SET NOT NULL;
-- 2. Drop old category column: ALTER TABLE products DROP COLUMN category;
-- 
-- For now, keeping both for safety during transition period.
