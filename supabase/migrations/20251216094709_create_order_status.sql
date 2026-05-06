-- 1️⃣ Create ENUM for order status
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'CREATED',
    'PAYMENT_PENDING',
    'PAID',
    'FAILED',
    'CANCELLED',
    'FULFILLMENT_PENDING',
    'SHIPPED',
    'DELIVERED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2️⃣ Add status column if missing
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS status order_status NOT NULL DEFAULT 'CREATED';

-- 3️⃣ Ensure currency column exists (safe guard)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';
