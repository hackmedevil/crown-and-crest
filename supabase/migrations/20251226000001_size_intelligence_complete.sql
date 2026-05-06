-- ============================================
-- SIZE INTELLIGENCE SYSTEM - MASTER MIGRATION
-- ============================================
-- Complete database schema for Size Intelligence
-- Run this in Supabase SQL Editor
-- 
-- Components:
-- 1. Size Charts (Brand Truth)
-- 2. Categories (Structured Management)
-- 3. User Sizebook (Customer Truth)
-- ============================================

-- ============================================
-- PART 1: SIZE CHARTS SYSTEM - BRAND TRUTH
-- ============================================

-- Create size_charts table (brand truth)
CREATE TABLE IF NOT EXISTS size_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  measurements JSONB NOT NULL,
  fit_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_size_chart_name_category UNIQUE(name, category),
  CONSTRAINT measurements_not_empty CHECK (jsonb_typeof(measurements) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_size_charts_category ON size_charts(category);
CREATE INDEX IF NOT EXISTS idx_size_charts_fit_type ON size_charts(fit_type);

-- Product-to-size-chart mapping (1:1)
CREATE TABLE IF NOT EXISTS product_size_charts (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  size_chart_id UUID NOT NULL REFERENCES size_charts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_size_charts_chart ON product_size_charts(size_chart_id);

-- RLS for size charts
ALTER TABLE size_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_size_charts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view size charts" ON size_charts FOR SELECT USING (true);
CREATE POLICY "Public can view product size mappings" ON product_size_charts FOR SELECT USING (true);

-- Admin policies (update these after user_roles table is created)
-- For now, using email check - replace with proper role check later
CREATE POLICY "Admins can manage size charts" ON size_charts FOR ALL
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@admin%' OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can manage product size mappings" ON product_size_charts FOR ALL
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@admin%' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Update trigger function (reusable)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

CREATE TRIGGER update_size_charts_updated_at BEFORE UPDATE ON size_charts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_size_charts_updated_at BEFORE UPDATE ON product_size_charts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Validation helpers
CREATE OR REPLACE FUNCTION validate_size_chart_measurements(measurements JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT (measurements ? 'unit') THEN RETURN FALSE; END IF;
  IF NOT (measurements ? 'sizes') THEN RETURN FALSE; END IF;
  IF jsonb_typeof(measurements->'sizes') != 'object' THEN RETURN FALSE; END IF;
  IF jsonb_object_keys_count(measurements->'sizes') = 0 THEN RETURN FALSE; END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION jsonb_object_keys_count(obj JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM jsonb_object_keys(obj));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON TABLE size_charts IS 'Brand truth: Admin-defined garment measurements for size charts';
COMMENT ON TABLE product_size_charts IS 'One-to-one mapping: product to size chart (1 product = 1 chart)';

-- ============================================
-- PART 2: CATEGORIES SYSTEM - STRUCTURED MANAGEMENT
-- ============================================

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_position ON categories(position);

-- Migrate existing free-text categories
INSERT INTO categories (name, slug, is_active, position)
SELECT DISTINCT 
  category as name,
  LOWER(REPLACE(REPLACE(category, ' ', '-'), '&', 'and')) as slug,
  true as is_active,
  ROW_NUMBER() OVER (ORDER BY category) as position
FROM products
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Add category_id to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Update products to use category_id
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE p.category = c.name AND p.category_id IS NULL;

-- RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories" ON categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON categories FOR ALL
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@admin%' OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Category hierarchy helper
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
  SELECT 
    c.id, c.name, c.slug, c.parent_id,
    0 as level,
    c.name::TEXT as full_path
  FROM categories c
  WHERE c.parent_id IS NULL AND c.is_active = true
  
  UNION ALL
  
  SELECT 
    c.id, c.name, c.slug, c.parent_id,
    ct.level + 1,
    ct.full_path || ' > ' || c.name
  FROM categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
  WHERE c.is_active = true
)
SELECT * FROM category_tree ORDER BY full_path;
$$ LANGUAGE sql STABLE;

COMMENT ON TABLE categories IS 'Structured category management with hierarchy support';

-- ============================================
-- PART 3: USER SIZEBOOK - CUSTOMER TRUTH
-- ============================================

-- Create user_sizebook table
CREATE TABLE IF NOT EXISTS user_sizebook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid UUID NOT NULL,
  gender VARCHAR(20),
  height_cm DECIMAL(5, 2),
  weight_kg DECIMAL(5, 2),
  measurements JSONB NOT NULL DEFAULT '{}',
  fit_preference VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_user_sizebook UNIQUE(user_uid),
  CONSTRAINT fk_user_sizebook_user FOREIGN KEY (user_uid) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'unisex', 'prefer_not_to_say') OR gender IS NULL),
  CONSTRAINT valid_fit_preference CHECK (fit_preference IN ('slim', 'regular', 'loose') OR fit_preference IS NULL),
  CONSTRAINT height_range CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250)),
  CONSTRAINT weight_range CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 300)),
  CONSTRAINT measurements_is_object CHECK (jsonb_typeof(measurements) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_user_sizebook_user ON user_sizebook(user_uid);

-- RLS for user sizebook (PRIVACY-FIRST)
ALTER TABLE user_sizebook ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sizebook" ON user_sizebook FOR SELECT
  USING (auth.uid() = user_uid);

CREATE POLICY "Users can insert own sizebook" ON user_sizebook FOR INSERT
  WITH CHECK (auth.uid() = user_uid);

CREATE POLICY "Users can update own sizebook" ON user_sizebook FOR UPDATE
  USING (auth.uid() = user_uid) WITH CHECK (auth.uid() = user_uid);

CREATE POLICY "Users can delete own sizebook" ON user_sizebook FOR DELETE
  USING (auth.uid() = user_uid);

CREATE TRIGGER update_user_sizebook_updated_at BEFORE UPDATE ON user_sizebook
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sizebook validation
CREATE OR REPLACE FUNCTION validate_sizebook_measurements(measurements JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  key TEXT;
  value NUMERIC;
BEGIN
  IF measurements = '{}'::jsonb THEN RETURN TRUE; END IF;
  IF jsonb_typeof(measurements) != 'object' THEN RETURN FALSE; END IF;
  
  FOR key, value IN SELECT * FROM jsonb_each_text(measurements)
  LOOP
    BEGIN
      value := measurements->>key;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;
    
    CASE key
      WHEN 'chest_cm', 'bust_cm' THEN
        IF value < 70 OR value > 150 THEN RETURN FALSE; END IF;
      WHEN 'waist_cm' THEN
        IF value < 50 OR value > 150 THEN RETURN FALSE; END IF;
      WHEN 'hip_cm' THEN
        IF value < 70 OR value > 160 THEN RETURN FALSE; END IF;
      WHEN 'shoulder_cm' THEN
        IF value < 30 OR value > 70 THEN RETURN FALSE; END IF;
      WHEN 'inseam_cm', 'rise_cm', 'sleeve_cm' THEN
        IF value < 15 OR value > 120 THEN RETURN FALSE; END IF;
      ELSE
        IF value < 0 OR value > 300 THEN RETURN FALSE; END IF;
    END CASE;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sizebook completeness helper
CREATE OR REPLACE FUNCTION get_sizebook_completeness(p_user_uid UUID)
RETURNS TABLE (
  total_fields INT,
  filled_fields INT,
  completion_pct DECIMAL
) AS $$
DECLARE
  v_measurements JSONB;
  v_gender TEXT;
  v_total INT;
  v_filled INT;
BEGIN
  SELECT 
    COALESCE(measurements, '{}'::jsonb), gender
  INTO v_measurements, v_gender
  FROM user_sizebook
  WHERE user_uid = p_user_uid;
  
  IF v_measurements IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0::DECIMAL;
    RETURN;
  END IF;
  
  v_total := 5;
  v_filled := 0;
  
  IF v_measurements ? 'chest_cm' OR v_measurements ? 'bust_cm' THEN v_filled := v_filled + 1; END IF;
  IF v_measurements ? 'waist_cm' THEN v_filled := v_filled + 1; END IF;
  IF v_measurements ? 'hip_cm' THEN v_filled := v_filled + 1; END IF;
  IF v_measurements ? 'shoulder_cm' THEN v_filled := v_filled + 1; END IF;
  IF EXISTS (SELECT 1 FROM user_sizebook WHERE user_uid = p_user_uid AND height_cm IS NOT NULL) THEN
    v_filled := v_filled + 1;
  END IF;
  
  RETURN QUERY SELECT 
    v_total,
    v_filled,
    ROUND((v_filled::DECIMAL / v_total::DECIMAL) * 100, 0)::DECIMAL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE user_sizebook IS 'Customer truth: User body measurements and preferences (privacy-first, user-owned)';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Tables created:
-- - size_charts (brand measurements)
-- - product_size_charts (1:1 product mapping)
-- - categories (structured hierarchy)
-- - user_sizebook (customer measurements)
--
-- RLS policies enforced:
-- - Size charts: Public read, admin write
-- - Categories: Public read active, admin manage all
-- - Sizebook: User-only access (NO admin access)
-- ============================================
