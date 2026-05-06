-- =====================================================
-- Store Settings Table
-- =====================================================
-- Stores global store configuration like store name and logo
-- Uses singleton pattern (only one row with id = 1)

CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Singleton pattern
  store_name TEXT NOT NULL DEFAULT 'Crown & Crest',
  logo_url TEXT, -- Cloudinary URL for custom logo
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default row
INSERT INTO store_settings (id, store_name, logo_url)
VALUES (1, 'Crown & Crest', NULL)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Public read access (needed for storefront)
CREATE POLICY "Anyone can read store settings"
  ON store_settings
  FOR SELECT
  TO public
  USING (true);

-- Admin-only write access
CREATE POLICY "Only admins can update store settings"
  ON store_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.firebase_uid = auth.uid()::text
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Updated At Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE store_settings IS 'Global store configuration (singleton pattern - only one row)';
COMMENT ON COLUMN store_settings.id IS 'Always 1 (singleton pattern)';
COMMENT ON COLUMN store_settings.store_name IS 'Display name of the store';
COMMENT ON COLUMN store_settings.logo_url IS 'Cloudinary URL for custom logo (nullable - falls back to default)';
