-- Migration: Create abandoned_checkouts table for tracking Razorpay abandoned checkout events
-- Date: 2026-02-12

-- Create abandoned_checkouts table
CREATE TABLE IF NOT EXISTS abandoned_checkouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  razorpay_order_id TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  amount INTEGER NOT NULL, -- Amount in paise
  currency TEXT DEFAULT 'INR',
  checkout_data JSONB NOT NULL, -- Full checkout payload from Razorpay
  abandoned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recovered_at TIMESTAMPTZ, -- When/if the checkout was completed
  recovery_attempted_at TIMESTAMPTZ, -- When recovery email/SMS was sent
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_order_id 
  ON abandoned_checkouts(order_id);

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_razorpay_order_id 
  ON abandoned_checkouts(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_customer_email 
  ON abandoned_checkouts(customer_email);

CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_abandoned_at 
  ON abandoned_checkouts(abandoned_at DESC);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_abandoned_checkouts_updated_at ON abandoned_checkouts;
CREATE TRIGGER set_abandoned_checkouts_updated_at
  BEFORE UPDATE ON abandoned_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all abandoned checkouts
DROP POLICY IF EXISTS "Admins can view abandoned checkouts" ON abandoned_checkouts;
CREATE POLICY "Admins can view abandoned checkouts"
  ON abandoned_checkouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text
      AND role::text IN ('admin', 'super_admin')
    )
  );

-- Policy: System can insert abandoned checkout records
DROP POLICY IF EXISTS "System can insert abandoned checkouts" ON abandoned_checkouts;
CREATE POLICY "System can insert abandoned checkouts"
  ON abandoned_checkouts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Admins can update abandoned checkouts (for recovery tracking)
DROP POLICY IF EXISTS "Admins can update abandoned checkouts" ON abandoned_checkouts;
CREATE POLICY "Admins can update abandoned checkouts"
  ON abandoned_checkouts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text
      AND role::text IN ('admin', 'super_admin')
    )
  );

-- Add order status 'ABANDONED' if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'order_status'
  ) THEN
    -- Type doesn't exist yet, will be created by other migrations
    NULL;
  ELSE
    -- Check if ABANDONED status exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'ABANDONED' 
      AND enumtypid = 'order_status'::regtype
    ) THEN
      ALTER TYPE order_status ADD VALUE 'ABANDONED';
    END IF;
  END IF;
END
$$;

-- Create admin view for abandoned checkout analytics
CREATE OR REPLACE VIEW abandoned_checkout_analytics AS
SELECT 
  DATE(abandoned_at) as date,
  COUNT(*) as total_abandoned,
  COUNT(recovered_at) as total_recovered,
  ROUND(COUNT(recovered_at)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as recovery_rate,
  SUM(amount) / 100.0 as total_abandoned_amount,
  SUM(CASE WHEN recovered_at IS NOT NULL THEN amount ELSE 0 END) / 100.0 as total_recovered_amount
FROM abandoned_checkouts
GROUP BY DATE(abandoned_at)
ORDER BY date DESC;

-- Grant access to authenticated users (admins will see via RLS)
GRANT SELECT ON abandoned_checkout_analytics TO authenticated;

COMMENT ON TABLE abandoned_checkouts IS 'Tracks abandoned checkout events from Razorpay Magic Checkout webhook';
COMMENT ON COLUMN abandoned_checkouts.checkout_data IS 'Full JSON payload from Razorpay webhook for debugging';
COMMENT ON COLUMN abandoned_checkouts.recovered_at IS 'Timestamp when checkout was completed after abandonment';
COMMENT ON COLUMN abandoned_checkouts.recovery_attempted_at IS 'Timestamp when recovery campaign was triggered';
