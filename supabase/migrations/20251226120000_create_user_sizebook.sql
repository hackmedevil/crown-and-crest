-- ============================================
-- SIZEBOOK SYSTEM - USER BODY PROFILE
-- ============================================
-- Purpose: User's body measurements (what the customer measures)
-- Separate from Size Charts (what the product measures)
-- Privacy-first, user-owned, progressive completion
-- Per D2C Fashion Specification (CUSTOMER TRUTH)
-- ============================================

-- Create user_sizebook table (customer truth)
CREATE TABLE IF NOT EXISTS user_sizebook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid UUID NOT NULL,              -- Auth user ID
  
  -- Basic profile info
  gender VARCHAR(20),                   -- 'male', 'female', 'unisex', 'prefer_not_to_say'
  height_cm DECIMAL(5, 2),              -- Optional: User height in cm
  weight_kg DECIMAL(5, 2),              -- Optional: User weight in kg
  
  -- Body measurements (all optional, progressive completion)
  measurements JSONB NOT NULL DEFAULT '{}',  -- {chest_cm: 98, waist_cm: 84, ...}
  
  -- Fit preferences
  fit_preference VARCHAR(20),           -- 'slim', 'regular', 'loose'
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_sizebook UNIQUE(user_uid),
  CONSTRAINT fk_user_sizebook_user FOREIGN KEY (user_uid) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'unisex', 'prefer_not_to_say') OR gender IS NULL),
  CONSTRAINT valid_fit_preference CHECK (fit_preference IN ('slim', 'regular', 'loose') OR fit_preference IS NULL),
  CONSTRAINT height_range CHECK (height_cm IS NULL OR (height_cm >= 100 AND height_cm <= 250)),
  CONSTRAINT weight_range CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 300)),
  CONSTRAINT measurements_is_object CHECK (jsonb_typeof(measurements) = 'object')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sizebook_user ON user_sizebook(user_uid);

-- ============================================
-- JSONB MEASUREMENTS STRUCTURE (DOCUMENTATION)
-- ============================================
-- Progressive structure (all fields optional):
-- {
--   "chest_cm": 98,
--   "bust_cm": 96,
--   "waist_cm": 84,
--   "hip_cm": 102,
--   "shoulder_cm": 46,
--   "inseam_cm": 82,
--   "rise_cm": 28,
--   "sleeve_cm": 62
-- }
-- 
-- RULES:
-- - All measurements in cm
-- - All fields are optional (progressive completion)
-- - No size labels (S/M/L) stored here
-- - No recommendations stored here
-- - No product references
-- ============================================

-- ============================================
-- ROW LEVEL SECURITY (PRIVACY-FIRST)
-- ============================================

ALTER TABLE user_sizebook ENABLE ROW LEVEL SECURITY;

-- Users can only view their own Sizebook
CREATE POLICY "Users can view own sizebook"
  ON user_sizebook FOR SELECT
  USING (auth.uid() = user_uid);

-- Users can insert their own Sizebook
CREATE POLICY "Users can insert own sizebook"
  ON user_sizebook FOR INSERT
  WITH CHECK (auth.uid() = user_uid);

-- Users can update their own Sizebook
CREATE POLICY "Users can update own sizebook"
  ON user_sizebook FOR UPDATE
  USING (auth.uid() = user_uid)
  WITH CHECK (auth.uid() = user_uid);

-- Users can delete their own Sizebook
CREATE POLICY "Users can delete own sizebook"
  ON user_sizebook FOR DELETE
  USING (auth.uid() = user_uid);

-- CRITICAL: Admins CANNOT access user Sizebook data
-- This is different from Size Charts (brand data)
-- User body measurements are private

-- ============================================
-- UPDATE TRIGGER
-- ============================================

CREATE TRIGGER update_user_sizebook_updated_at
  BEFORE UPDATE ON user_sizebook
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: VALIDATE SIZEBOOK MEASUREMENTS
-- ============================================

CREATE OR REPLACE FUNCTION validate_sizebook_measurements(measurements JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  key TEXT;
  value NUMERIC;
BEGIN
  -- Empty object is valid (progressive completion)
  IF measurements = '{}'::jsonb THEN
    RETURN TRUE;
  END IF;
  
  -- Must be an object
  IF jsonb_typeof(measurements) != 'object' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate each measurement
  FOR key, value IN SELECT * FROM jsonb_each_text(measurements)
  LOOP
    -- Value must be numeric
    BEGIN
      value := measurements->>key;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;
    END;
    
    -- Check reasonable ranges based on measurement type
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
        -- Unknown measurement keys are allowed (extensibility)
        -- But value must still be reasonable (positive, not too large)
        IF value < 0 OR value > 300 THEN RETURN FALSE; END IF;
    END CASE;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- HELPER FUNCTION: GET MEASUREMENT COMPLETENESS
-- ============================================

CREATE OR REPLACE FUNCTION get_sizebook_completeness(p_user_uid UUID)
RETURNS TABLE (
  total_fields INT,
  filled_fields INT,
  completion_pct DECIMAL
) AS $$
DECLARE
  v_measurements JSONB;
  v_gender TEXT;
BEGIN
  -- Get user's sizebook
  SELECT 
    COALESCE(measurements, '{}'::jsonb),
    gender
  INTO v_measurements, v_gender
  FROM user_sizebook
  WHERE user_uid = p_user_uid;
  
  -- If no sizebook, return 0
  IF v_measurements IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0::DECIMAL;
    RETURN;
  END IF;
  
  -- Count fields based on gender (relevant measurements)
  DECLARE
    v_total INT;
    v_filled INT;
  BEGIN
    -- Define expected fields based on use case
    -- For simplicity, count core measurements
    v_total := 5; -- chest/bust, waist, hip, shoulder, height
    
    v_filled := 0;
    IF v_measurements ? 'chest_cm' OR v_measurements ? 'bust_cm' THEN v_filled := v_filled + 1; END IF;
    IF v_measurements ? 'waist_cm' THEN v_filled := v_filled + 1; END IF;
    IF v_measurements ? 'hip_cm' THEN v_filled := v_filled + 1; END IF;
    IF v_measurements ? 'shoulder_cm' THEN v_filled := v_filled + 1; END IF;
    
    -- Check if height is filled
    IF EXISTS (SELECT 1 FROM user_sizebook WHERE user_uid = p_user_uid AND height_cm IS NOT NULL) THEN
      v_filled := v_filled + 1;
    END IF;
    
    RETURN QUERY SELECT 
      v_total,
      v_filled,
      ROUND((v_filled::DECIMAL / v_total::DECIMAL) * 100, 0)::DECIMAL;
  END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_sizebook IS 'Customer truth: User body measurements and preferences (privacy-first, user-owned)';
COMMENT ON COLUMN user_sizebook.measurements IS 'JSONB of user body measurements: {chest_cm: 98, waist_cm: 84, ...} - all optional';
COMMENT ON COLUMN user_sizebook.gender IS 'User gender for fit recommendations (optional)';
COMMENT ON COLUMN user_sizebook.fit_preference IS 'Preferred fit style: slim, regular, or loose';
COMMENT ON COLUMN user_sizebook.height_cm IS 'User height in centimeters (optional)';
COMMENT ON COLUMN user_sizebook.weight_kg IS 'User weight in kilograms (optional, for advanced recommendations)';

-- ============================================
-- CRITICAL PRIVACY NOTES
-- ============================================
-- 1. This table is USER-OWNED ONLY
-- 2. Admins do NOT have access (unlike size_charts)
-- 3. All measurements are optional (progressive completion)
-- 4. No size labels (S/M/L) stored
-- 5. No recommendations stored
-- 6. No product or size chart references
-- 7. RLS enforces strict user isolation
-- ============================================
