-- Razorpay Magic Checkout: Add COD and Risk Intelligence Fields
-- Migration: 20251222_magic_checkout_fields.sql

-- Add payment method and COD fields
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20), -- 'PREPAID' or 'COD'
ADD COLUMN IF NOT EXISTS is_cod BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cod_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cod_allowed_by_razorpay BOOLEAN,
ADD COLUMN IF NOT EXISTS cod_eligibility_reason TEXT;

-- Add risk intelligence fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS razorpay_risk_tier VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH'
ADD COLUMN IF NOT EXISTS gateway_notes JSONB; -- All Razorpay metadata

-- Update razorpay_payment_id to be nullable (for COD orders)
ALTER TABLE orders 
ALTER COLUMN razorpay_payment_id DROP NOT NULL;

-- Add indexes for admin filtering
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_is_cod ON orders(is_cod);
CREATE INDEX IF NOT EXISTS idx_orders_risk_tier ON orders(razorpay_risk_tier);

-- Commenting out status constraint to avoid migration conflicts
-- Validation will be handled at application level
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_magic_check ...

-- Comment for documentation
COMMENT ON COLUMN orders.payment_method IS 'Payment method used: PREPAID or COD';
COMMENT ON COLUMN orders.is_cod IS 'Whether this order is Cash on Delivery';
COMMENT ON COLUMN orders.cod_fee IS 'COD service fee charged (if applicable)';
COMMENT ON COLUMN orders.razorpay_risk_tier IS 'Razorpay risk assessment: LOW, MEDIUM, HIGH';
COMMENT ON COLUMN orders.gateway_notes IS 'Complete Razorpay metadata for admin reference';
