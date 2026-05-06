-- Clean slate: Drop existing policies and table if they exist
-- Then recreate everything fresh

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read store settings" ON store_settings;
DROP POLICY IF EXISTS "Only admins can update store settings" ON store_settings;

-- Drop trigger and function
DROP TRIGGER IF EXISTS store_settings_updated_at ON store_settings;
DROP FUNCTION IF EXISTS update_store_settings_updated_at();

-- Drop table
DROP TABLE IF EXISTS store_settings;

-- Create table
CREATE TABLE store_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT 'Crown & Crest',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default row
INSERT INTO store_settings (id, store_name, logo_url)
VALUES (1, 'Crown & Crest', NULL);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Anyone can read store settings"
  ON store_settings
  FOR SELECT
  TO public
  USING (true);

-- Admin write policy (with proper type casting)
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

-- Update trigger function
CREATE FUNCTION update_store_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger
CREATE TRIGGER store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_store_settings_updated_at();

-- Verify the setup
SELECT * FROM store_settings;
