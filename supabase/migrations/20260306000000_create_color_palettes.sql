-- Create Color Palettes and Colors System
-- Created: March 6, 2026
-- Purpose: Manage color palettes for product variants with hex codes and names

-- ============================================================================
-- 1. COLOR PALETTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS color_palettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50),              -- e.g., "apparel", "seasonal", "brand"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT name_not_empty CHECK (name != '')
);

CREATE INDEX IF NOT EXISTS idx_color_palettes_active 
  ON color_palettes(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_color_palettes_category 
  ON color_palettes(category);

COMMENT ON TABLE color_palettes IS 'Named collections of colors for product variants';
COMMENT ON COLUMN color_palettes.name IS 'Palette name (e.g., "Summer Collection", "Basic Colors")';
COMMENT ON COLUMN color_palettes.category IS 'Optional category for organization';

-- ============================================================================
-- 2. COLORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  palette_id UUID NOT NULL REFERENCES color_palettes(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  hex_code VARCHAR(7) NOT NULL,     -- Format: #RRGGBB
  display_order INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique color names per palette
  UNIQUE(palette_id, name),
  -- Validate hex code format
  CONSTRAINT valid_hex_code CHECK (hex_code ~ '^#[0-9A-Fa-f]{6}$'),
  -- Ensure non-empty name
  CONSTRAINT name_not_empty CHECK (name != '')
);

CREATE INDEX IF NOT EXISTS idx_colors_palette 
  ON colors(palette_id);

CREATE INDEX IF NOT EXISTS idx_colors_hex 
  ON colors(hex_code);

CREATE INDEX IF NOT EXISTS idx_colors_name 
  ON colors(name);

CREATE INDEX IF NOT EXISTS idx_colors_active 
  ON colors(palette_id, is_active) WHERE is_active = true;

COMMENT ON TABLE colors IS 'Individual colors with hex codes belonging to color palettes';
COMMENT ON COLUMN colors.name IS 'Color name (e.g., "Navy Blue", "Forest Green")';
COMMENT ON COLUMN colors.hex_code IS 'Hex color code in format #RRGGBB';
COMMENT ON COLUMN colors.display_order IS 'Sort order within palette';

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE color_palettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;

-- Public can view active color palettes and colors (needed for product pages)
CREATE POLICY "Public can view active color palettes"
  ON color_palettes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can view active colors"
  ON colors FOR SELECT
  USING (is_active = true);

-- Admins can manage color palettes (full CRUD)
CREATE POLICY "Admins can manage color palettes"
  ON color_palettes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text AND role::text = 'admin'
    )
  );

CREATE POLICY "Admins can manage colors"
  ON colors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text AND role::text = 'admin'
    )
  );

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

-- Reuse existing function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_color_palettes_updated_at
  BEFORE UPDATE ON color_palettes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colors_updated_at
  BEFORE UPDATE ON colors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. SAMPLE DATA (Optional - for development)
-- ============================================================================

INSERT INTO color_palettes (name, description, category) VALUES
  ('Basic Colors', 'Essential colors for all products', 'standard'),
  ('Summer Collection', 'Vibrant summer colors', 'seasonal'),
  ('Winter Collection', 'Deep winter tones', 'seasonal')
ON CONFLICT (name) DO NOTHING;

INSERT INTO colors (palette_id, name, hex_code, display_order)
SELECT 
  (SELECT id FROM color_palettes WHERE name = 'Basic Colors'),
  color_name,
  hex_value,
  row_number
FROM (VALUES
  ('Black', '#000000', 1),
  ('White', '#FFFFFF', 2),
  ('Navy Blue', '#001F3F', 3),
  ('Gray', '#808080', 4),
  ('Red', '#FF0000', 5),
  ('Blue', '#0074D9', 6),
  ('Green', '#2ECC40', 7),
  ('Yellow', '#FFDC00', 8)
) AS v(color_name, hex_value, row_number)
ON CONFLICT (palette_id, name) DO NOTHING;
