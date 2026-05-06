-- Migration: Create webhook event tracking tables
-- Date: 2026-02-12

-- Create webhook_logs table for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type 
  ON webhook_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_id 
  ON webhook_logs(order_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at 
  ON webhook_logs(received_at DESC);

-- Create order_disputes table
CREATE TABLE IF NOT EXISTS order_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_payment_id TEXT NOT NULL,
  dispute_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL, -- created, won, lost, closed, under_review, action_required
  amount INTEGER NOT NULL,
  reason_code TEXT,
  reason_description TEXT,
  dispute_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_disputes_order_id 
  ON order_disputes(order_id);

CREATE INDEX IF NOT EXISTS idx_order_disputes_status 
  ON order_disputes(status);

CREATE INDEX IF NOT EXISTS idx_order_disputes_created_at 
  ON order_disputes(created_at DESC);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_order_disputes_updated_at ON order_disputes;
CREATE TRIGGER set_order_disputes_updated_at
  BEFORE UPDATE ON order_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create order_refunds table
CREATE TABLE IF NOT EXISTS order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_refund_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL, -- created, processed, failed, speed_changed
  refund_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order_id 
  ON order_refunds(order_id);

CREATE INDEX IF NOT EXISTS idx_order_refunds_status 
  ON order_refunds(status);

CREATE INDEX IF NOT EXISTS idx_order_refunds_created_at 
  ON order_refunds(created_at DESC);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS set_order_refunds_updated_at ON order_refunds;
CREATE TRIGGER set_order_refunds_updated_at
  BEFORE UPDATE ON order_refunds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add new columns to orders table if they don't exist
DO $$ 
BEGIN
  -- Add settlement_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'settlement_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN settlement_id TEXT;
  END IF;

  -- Add settled_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'settled_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN settled_at TIMESTAMPTZ;
  END IF;

  -- Add refund_amount column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN refund_amount INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add new order statuses if they don't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    -- Add PAYMENT_AUTHORIZED status
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'PAYMENT_AUTHORIZED' 
      AND enumtypid = 'order_status'::regtype
    ) THEN
      ALTER TYPE order_status ADD VALUE 'PAYMENT_AUTHORIZED';
    END IF;

    -- Add DISPUTED status
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'DISPUTED' 
      AND enumtypid = 'order_status'::regtype
    ) THEN
      ALTER TYPE order_status ADD VALUE 'DISPUTED';
    END IF;

    -- Add REFUNDED status
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'REFUNDED' 
      AND enumtypid = 'order_status'::regtype
    ) THEN
      ALTER TYPE order_status ADD VALUE 'REFUNDED';
    END IF;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_logs
DROP POLICY IF EXISTS "Admins can view webhook logs" ON webhook_logs;
CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text
      AND role IN ('admin')
    )
  );

DROP POLICY IF EXISTS "System can insert webhook logs" ON webhook_logs;
CREATE POLICY "System can insert webhook logs"
  ON webhook_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for order_disputes
DROP POLICY IF EXISTS "Admins can view disputes" ON order_disputes;
CREATE POLICY "Admins can view disputes"
  ON order_disputes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text
      AND role IN ('admin')
    )
  );

DROP POLICY IF EXISTS "System can manage disputes" ON order_disputes;
CREATE POLICY "System can manage disputes"
  ON order_disputes
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for order_refunds
DROP POLICY IF EXISTS "Admins can view refunds" ON order_refunds;
CREATE POLICY "Admins can view refunds"
  ON order_refunds
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE firebase_uid = auth.uid()::text
      AND role IN ('admin')
    )
  );

DROP POLICY IF EXISTS "System can manage refunds" ON order_refunds;
CREATE POLICY "System can manage refunds"
  ON order_refunds
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create analytics views
CREATE OR REPLACE VIEW dispute_analytics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_disputes,
  COUNT(*) FILTER (WHERE status = 'won') as disputes_won,
  COUNT(*) FILTER (WHERE status = 'lost') as disputes_lost,
  SUM(amount) / 100.0 as total_disputed_amount
FROM order_disputes
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE OR REPLACE VIEW refund_analytics AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_refunds,
  COUNT(*) FILTER (WHERE status = 'processed') as refunds_processed,
  COUNT(*) FILTER (WHERE status = 'failed') as refunds_failed,
  SUM(amount) FILTER (WHERE status = 'processed') / 100.0 as total_refunded_amount
FROM order_refunds
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant access to views
GRANT SELECT ON dispute_analytics TO authenticated;
GRANT SELECT ON refund_analytics TO authenticated;

COMMENT ON TABLE webhook_logs IS 'Logs all Razorpay webhook events for debugging';
COMMENT ON TABLE order_disputes IS 'Tracks payment disputes and chargebacks';
COMMENT ON TABLE order_refunds IS 'Tracks all refund transactions';
