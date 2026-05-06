-- ============================================
-- SIZE CHARTS SYSTEM - BRAND TRUTH
-- ============================================
-- Purpose: Define garment measurements (what the product measures)
-- Separate from Sizebook (what the customer measures)
-- Per D2C Fashion Specification (APPROVED SCHEMA)
-- ============================================

-- Create size_charts table (brand truth)
CREATE TABLE IF NOT EXISTS size_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- e.g., "Men's Shirts - Regular Fit"
  category VARCHAR(50) NOT NULL,        -- e.g., "men_top", "women_dress", "men_bottom"
  measurements JSONB NOT NULL,          -- All sizes + measurements (structured, see below)
  fit_type VARCHAR(50),                 -- e.g., "Regular", "Slim", "Relaxed", "Oversized"
  notes TEXT,                           -- Admin notes, e.g., "Runs slightly large"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_size_chart_name_category UNIQUE(name, category),
  CONSTRAINT measurements_not_empty CHECK (jsonb_typeof(measurements) = 'object')
);

-- Indexes for size_charts
CREATE INDEX IF NOT EXISTS idx_size_charts_category ON size_charts(category);
CREATE INDEX IF NOT EXISTS idx_size_charts_fit_type ON size_charts(fit_type);

-- ============================================
-- JSONB MEASUREMENTS STRUCTURE (DOCUMENTATION)
-- ============================================
-- Required structure:
-- {
--   "unit": "cm",
--   "sizes": {
--     "S": { "chest": 91, "waist": 76, "length": 68, "shoulder": 42 },
--     "M": { "chest": 96, "waist": 81, "length": 70, "shoulder": 44 },
--     "L": { "chest": 101, "waist": 86, "length": 72, "shoulder": 46 }
--   },
--   "tolerance_cm": 3
-- }
-- ============================================

-- ============================================
-- PRODUCT-TO-SIZE-CHART MAPPING (1:1)
-- ============================================
-- One product maps to exactly one size chart
-- All size labels live ONLY in size_charts.measurements
-- No duplication, no partial mappings

CREATE TABLE IF NOT EXISTS product_size_charts (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  size_chart_id UUID NOT NULL REFERENCES size_charts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for reverse lookup (which products use this chart)
CREATE INDEX IF NOT EXISTS idx_product_size_charts_chart 
  ON product_size_charts(size_chart_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE size_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_size_charts ENABLE ROW LEVEL SECURITY;

-- Public can view size charts (needed for PDP size chart modal)
CREATE POLICY "Public can view size charts"
  ON size_charts FOR SELECT
  USING (true);

CREATE POLICY "Public can view product size mappings"
  ON product_size_charts FOR SELECT
  USING (true);

-- Admins can manage size charts (full CRUD)
CREATE POLICY "Admins can manage size charts"
  ON size_charts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage product size mappings"
  ON product_size_charts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- UPDATE TRIGGER
-- ============================================

-- Reuse existing trigger function or create if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Apply trigger to size_charts
CREATE TRIGGER update_size_charts_updated_at
  BEFORE UPDATE ON size_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to product_size_charts
CREATE TRIGGER update_product_size_charts_updated_at
  BEFORE UPDATE ON product_size_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: VALIDATE MEASUREMENTS STRUCTURE
-- ============================================

CREATE OR REPLACE FUNCTION validate_size_chart_measurements(measurements JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Must have 'unit' key
  IF NOT (measurements ? 'unit') THEN
    RETURN FALSE;
  END IF;
  
  -- Must have 'sizes' object
  IF NOT (measurements ? 'sizes') THEN
    RETURN FALSE;
  END IF;
  
  -- 'sizes' must be an object
  IF jsonb_typeof(measurements->'sizes') != 'object' THEN
    RETURN FALSE;
  END IF;
  
  -- Must have at least one size
  IF jsonb_object_keys_count(measurements->'sizes') = 0 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function for counting object keys
CREATE OR REPLACE FUNCTION jsonb_object_keys_count(obj JSONB)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM jsonb_object_keys(obj));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE size_charts IS 'Brand truth: Admin-defined garment measurements for size charts';
COMMENT ON TABLE product_size_charts IS 'One-to-one mapping: product to size chart (1 product = 1 chart)';
COMMENT ON COLUMN size_charts.measurements IS 'JSONB structure: {unit: "cm", sizes: {S: {chest: 91, ...}, M: {...}}, tolerance_cm: 3}';
COMMENT ON COLUMN size_charts.fit_type IS 'Fit category: Regular, Slim, Relaxed, Oversized, etc.';
COMMENT ON COLUMN size_charts.category IS 'Product category this chart applies to: men_top, women_dress, men_bottom, etc.';
COMMENT ON COLUMN product_size_charts.product_id IS 'PRIMARY KEY enforces 1:1 relationship (one product = one chart)';
