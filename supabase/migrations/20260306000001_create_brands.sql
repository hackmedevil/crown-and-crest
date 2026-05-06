-- Create Brands System
-- Created: March 6, 2026
-- Purpose: Manage brand names for products and SKU generation

-- ============================================================================
-- 1. BRANDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,  -- Used in SKU generation (e.g., "CC" for Crown & Crest)
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT name_not_empty CHECK (name != ''),
  CONSTRAINT code_not_empty CHECK (code != ''),
  CONSTRAINT code_format CHECK (code ~ '^[A-Z0-9-]+$')  -- Only uppercase letters, numbers, hyphens
);

CREATE INDEX IF NOT EXISTS idx_brands_active 
  ON brands(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_brands_code 
  ON brands(code);

COMMENT ON TABLE brands IS 'Product brands for SKU generation and organization';
COMMENT ON COLUMN brands.name IS 'Brand display name (e.g., "Crown & Crest")';
COMMENT ON COLUMN brands.code IS 'Brand code for SKU (e.g., "CC")';

-- ============================================================================
-- 2. ADD BRAND TO PRODUCTS TABLE
-- ============================================================================

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_brand 
  ON products(brand_id);

COMMENT ON COLUMN products.brand_id IS 'Reference to brand for SKU generation';

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Public can view active brands
CREATE POLICY "Public can view active brands"
  ON brands FOR SELECT
  USING (is_active = true);

-- Admins can manage brands
CREATE POLICY "Admins can manage brands"
  ON brands FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text AND role::text = 'admin'
    )
  );

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. SAMPLE DATA
-- ============================================================================

INSERT INTO brands (name, code, description) VALUES
  ('Crown & Crest', 'CC', 'Premium luxury fashion brand'),
  ('House Brand', 'HB', 'In-house private label'),
  ('Designer Collection', 'DC', 'High-end designer pieces')
ON CONFLICT (name) DO NOTHING;
