-- Phase 16: Returns & Fit Learning for Sizebook
-- Non-breaking migration: Adds feedback capture and learning infrastructure

-- ============================================
-- 1) ORDER ITEM FEEDBACK TABLE
-- ============================================

CREATE TYPE feedback_type AS ENUM (
  'TOO_SMALL',
  'TOO_LARGE',
  'FITS_WELL',
  'QUALITY_ISSUE',
  'OTHER'
);

CREATE TABLE order_item_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  user_uid UUID NOT NULL,
  size_profile_id UUID NULLABLE REFERENCES size_profiles(id) ON DELETE SET NULL,
  recommended_size VARCHAR(50) NULLABLE,
  selected_size VARCHAR(50) NOT NULL,
  feedback_type feedback_type NOT NULL,
  notes TEXT NULLABLE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: One feedback per order item
  UNIQUE(order_item_id),
  
  -- Foreign key constraint
  CONSTRAINT fk_feedback_user FOREIGN KEY (user_uid) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_order_item_feedback_order_item_id ON order_item_feedback(order_item_id);
CREATE INDEX idx_order_item_feedback_user_uid ON order_item_feedback(user_uid);
CREATE INDEX idx_order_item_feedback_size_profile_id ON order_item_feedback(size_profile_id);
CREATE INDEX idx_order_item_feedback_feedback_type ON order_item_feedback(feedback_type);
CREATE INDEX idx_order_item_feedback_created_at ON order_item_feedback(created_at DESC);
CREATE INDEX idx_order_item_feedback_profile_type ON order_item_feedback(size_profile_id, feedback_type) WHERE size_profile_id IS NOT NULL;

-- RLS: Users can view/insert their own feedback, admins can view all
ALTER TABLE order_item_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON order_item_feedback FOR SELECT
  USING (user_uid = auth.uid());

CREATE POLICY "Users can insert own feedback"
  ON order_item_feedback FOR INSERT
  WITH CHECK (user_uid = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON order_item_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- 2) SIZEBOOK FIT STATS TABLE (Learned Adjustments)
-- ============================================

CREATE TABLE sizebook_fit_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_profile_id UUID NOT NULL REFERENCES size_profiles(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  
  -- Statistical data
  total_feedback INT DEFAULT 0,
  fits_well_count INT DEFAULT 0,
  too_small_count INT DEFAULT 0,
  too_large_count INT DEFAULT 0,
  quality_issue_count INT DEFAULT 0,
  other_count INT DEFAULT 0,
  
  -- Learned adjustment (signed offset in cm)
  -- Example: If chest_cm adjustment_cm = +1.5, means add 1.5cm to profile measurements
  adjustment_cm DECIMAL(5, 2) DEFAULT 0,
  adjustment_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Audit trail
  previous_adjustment_cm DECIMAL(5, 2) NULLABLE,
  adjustment_reason VARCHAR(200) NULLABLE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: One stat entry per (size_profile, metric)
  UNIQUE(size_profile_id, metric),
  
  -- Ensure metric is valid (matches size profile's actual measurements)
  CONSTRAINT valid_metric CHECK (
    metric IN ('chest_cm', 'waist_cm', 'bust_cm', 'hip_cm', 'shoulder_cm', 'length_cm', 'inseam_cm', 'rise_cm')
  )
);

-- Indexes
CREATE INDEX idx_sizebook_fit_stats_size_profile_id ON sizebook_fit_stats(size_profile_id);
CREATE INDEX idx_sizebook_fit_stats_category ON sizebook_fit_stats(category);
CREATE INDEX idx_sizebook_fit_stats_metric ON sizebook_fit_stats(metric);
CREATE INDEX idx_sizebook_fit_stats_adjustment_updated_at ON sizebook_fit_stats(adjustment_updated_at DESC);
CREATE INDEX idx_sizebook_fit_stats_profile_metric ON sizebook_fit_stats(size_profile_id, metric);

-- RLS: Admins can view/update all, users cannot directly access
ALTER TABLE sizebook_fit_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fit stats"
  ON sizebook_fit_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "System can update fit stats (via RPC)"
  ON sizebook_fit_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- 3) ADJUSTMENT HISTORY TABLE (Audit Trail)
-- ============================================

CREATE TABLE sizebook_adjustment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  size_profile_id UUID NOT NULL REFERENCES size_profiles(id) ON DELETE CASCADE,
  metric VARCHAR(50) NOT NULL,
  
  -- What changed
  previous_adjustment_cm DECIMAL(5, 2) NOT NULL,
  new_adjustment_cm DECIMAL(5, 2) NOT NULL,
  
  -- Why
  reason VARCHAR(200) NOT NULL,
  adjustment_rule VARCHAR(100) NOT NULL,
  sample_count INT NOT NULL,
  fits_well_count INT NOT NULL,
  too_small_count INT NOT NULL,
  too_large_count INT NOT NULL,
  
  -- Who/when
  triggered_by VARCHAR(50) DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Reversibility
  is_reverted BOOLEAN DEFAULT FALSE,
  reverted_at TIMESTAMP WITH TIME ZONE NULLABLE,
  revert_reason VARCHAR(200) NULLABLE
);

-- Indexes
CREATE INDEX idx_adjustment_history_size_profile_id ON sizebook_adjustment_history(size_profile_id);
CREATE INDEX idx_adjustment_history_metric ON sizebook_adjustment_history(metric);
CREATE INDEX idx_adjustment_history_created_at ON sizebook_adjustment_history(created_at DESC);
CREATE INDEX idx_adjustment_history_is_reverted ON sizebook_adjustment_history(is_reverted);

-- RLS: Admins can view only
ALTER TABLE sizebook_adjustment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view adjustment history"
  ON sizebook_adjustment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_uid = auth.uid()
      AND role IN ('admin', 'moderator')
    )
  );

-- ============================================
-- 4) HELPER FUNCTIONS
-- ============================================

-- Function: Initialize fit stats for a size profile
-- Called when size profile is created or when first feedback arrives
CREATE OR REPLACE FUNCTION init_fit_stats_for_profile(
  p_size_profile_id UUID,
  p_category VARCHAR(50)
)
RETURNS VOID AS $$
DECLARE
  v_metrics TEXT[];
  v_metric TEXT;
  v_profile RECORD;
BEGIN
  -- Get size profile measurements
  SELECT * INTO v_profile FROM size_profiles WHERE id = p_size_profile_id;
  
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Size profile not found';
  END IF;
  
  -- Define metrics for category
  CASE p_category
    WHEN 'men_top' THEN
      v_metrics := ARRAY['chest_cm', 'waist_cm', 'shoulder_cm', 'length_cm'];
    WHEN 'men_bottom' THEN
      v_metrics := ARRAY['waist_cm', 'inseam_cm', 'rise_cm'];
    WHEN 'women_top' THEN
      v_metrics := ARRAY['chest_cm', 'waist_cm', 'shoulder_cm', 'length_cm'];
    WHEN 'women_bottom' THEN
      v_metrics := ARRAY['waist_cm', 'hip_cm', 'inseam_cm', 'rise_cm'];
    WHEN 'women_dress' THEN
      v_metrics := ARRAY['chest_cm', 'waist_cm', 'hip_cm', 'length_cm'];
    WHEN 'unisex_top' THEN
      v_metrics := ARRAY['chest_cm', 'waist_cm', 'shoulder_cm', 'length_cm'];
    WHEN 'unisex_bottom' THEN
      v_metrics := ARRAY['waist_cm', 'inseam_cm', 'rise_cm'];
    ELSE
      RAISE EXCEPTION 'Invalid category: %', p_category;
  END CASE;
  
  -- Insert stats for each metric (if not already exist)
  FOREACH v_metric IN ARRAY v_metrics LOOP
    INSERT INTO sizebook_fit_stats (size_profile_id, category, metric)
    VALUES (p_size_profile_id, p_category, v_metric)
    ON CONFLICT (size_profile_id, metric) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment fit stat counters
-- Called when feedback is saved
CREATE OR REPLACE FUNCTION increment_fit_stat(
  p_size_profile_id UUID,
  p_metric VARCHAR(50),
  p_feedback_type feedback_type
)
RETURNS VOID AS $$
BEGIN
  UPDATE sizebook_fit_stats
  SET
    total_feedback = total_feedback + 1,
    fits_well_count = CASE WHEN p_feedback_type = 'FITS_WELL' THEN fits_well_count + 1 ELSE fits_well_count END,
    too_small_count = CASE WHEN p_feedback_type = 'TOO_SMALL' THEN too_small_count + 1 ELSE too_small_count END,
    too_large_count = CASE WHEN p_feedback_type = 'TOO_LARGE' THEN too_large_count + 1 ELSE too_large_count END,
    quality_issue_count = CASE WHEN p_feedback_type = 'QUALITY_ISSUE' THEN quality_issue_count + 1 ELSE quality_issue_count END,
    other_count = CASE WHEN p_feedback_type = 'OTHER' THEN other_count + 1 ELSE other_count END,
    updated_at = NOW()
  WHERE size_profile_id = p_size_profile_id AND metric = p_metric;
END;
$$ LANGUAGE plpgsql;

-- Function: Get fit stats summary for admin dashboard
CREATE OR REPLACE FUNCTION get_fit_stats_summary(p_size_profile_id UUID)
RETURNS TABLE (
  metric VARCHAR,
  total_feedback INT,
  fits_well_pct DECIMAL,
  too_small_pct DECIMAL,
  too_large_pct DECIMAL,
  adjustment_cm DECIMAL,
  adjusted_at TIMESTAMP,
  sample_adequate BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sfs.metric,
    sfs.total_feedback,
    ROUND(100.0 * sfs.fits_well_count / NULLIF(sfs.total_feedback, 0), 1)::DECIMAL AS fits_well_pct,
    ROUND(100.0 * sfs.too_small_count / NULLIF(sfs.total_feedback, 0), 1)::DECIMAL AS too_small_pct,
    ROUND(100.0 * sfs.too_large_count / NULLIF(sfs.total_feedback, 0), 1)::DECIMAL AS too_large_pct,
    sfs.adjustment_cm,
    sfs.adjustment_updated_at,
    (sfs.total_feedback >= 10)::BOOLEAN AS sample_adequate
  FROM sizebook_fit_stats sfs
  WHERE sfs.size_profile_id = p_size_profile_id
  ORDER BY sfs.metric;
END;
$$ LANGUAGE plpgsql;
