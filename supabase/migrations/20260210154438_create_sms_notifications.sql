-- SMS Notifications System
-- Migration created: 2026-02-10 15:44:38
-- Purpose: Add SMS notification tracking and management

-- Create SMS notifications table
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  template_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  provider_message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_sms_order_id ON sms_notifications(order_id);
CREATE INDEX idx_sms_status ON sms_notifications(status);
CREATE INDEX idx_sms_created_at ON sms_notifications(created_at);
CREATE INDEX idx_sms_notification_type ON sms_notifications(notification_type);

-- Add RLS policies
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can view all SMS notifications
CREATE POLICY "Admins can view SMS notifications"
  ON sms_notifications
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT unnest(string_to_array(current_setting('app.admin_uids', true), ','))::uuid
    )
  );

-- Admin can insert SMS notifications
CREATE POLICY "Admins can insert SMS notifications"
  ON sms_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT unnest(string_to_array(current_setting('app.admin_uids', true), ','))::uuid
    )
  );

-- Admin can update SMS notifications (for delivery status updates)
CREATE POLICY "Admins can update SMS notifications"
  ON sms_notifications
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT unnest(string_to_array(current_setting('app.admin_uids', true), ','))::uuid
    )
  );

-- Add new order statuses for better tracking
DO $$ 
BEGIN
  -- Check if we need to add new order statuses
  -- This is a safe way to extend the existing order status type
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'order_status_extended'
  ) THEN
    -- Create a comment noting we may need to update the TypeScript enum
    COMMENT ON COLUMN orders.status IS 'Order status: CREATED, PAYMENT_PENDING, PAID, NEEDS_REVIEW, FAILED, CANCELLED, FULFILLMENT_PENDING, SHIPPED, DELIVERED, OUT_FOR_DELIVERY, RTO_IN_PROGRESS';
  END IF;
END $$;

-- Create function to prevent duplicate SMS for same order status
CREATE OR REPLACE FUNCTION prevent_duplicate_sms()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if SMS with same order_id and notification_type was sent in last 1 hour
  IF EXISTS (
    SELECT 1 FROM sms_notifications
    WHERE order_id = NEW.order_id
      AND notification_type = NEW.notification_type
      AND status IN ('SENT', 'DELIVERED')
      AND created_at > NOW() - INTERVAL '1 hour'
  ) THEN
    RAISE EXCEPTION 'Duplicate SMS notification prevented. Same notification was sent within last hour.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate SMS
CREATE TRIGGER prevent_duplicate_sms_trigger
  BEFORE INSERT ON sms_notifications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_sms();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_sms_updated_at_trigger
  BEFORE UPDATE ON sms_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_updated_at();

-- Add comment to table
COMMENT ON TABLE sms_notifications IS 'Tracks all SMS notifications sent to customers for orders';
COMMENT ON COLUMN sms_notifications.notification_type IS 'Type of notification: ORDER_CREATED, PAYMENT_CONFIRMED, ORDER_PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, COD_CONFIRMED, CANCELLED';
COMMENT ON COLUMN sms_notifications.status IS 'SMS delivery status: PENDING, SENT, FAILED, DELIVERED';
