-- Phase 2: unify order lifecycle and enforce Qikink as the active provider baseline

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'qikink',
ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
ADD COLUMN IF NOT EXISTS tracking_url TEXT,
ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0;

UPDATE orders
SET order_number = COALESCE(order_number, CONCAT('CC-', UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 10))))
WHERE order_number IS NULL;

UPDATE orders
SET provider = 'qikink'
WHERE provider IS NULL OR provider = '' OR provider <> 'qikink';

ALTER TABLE orders
ALTER COLUMN order_number SET NOT NULL,
ALTER COLUMN provider SET DEFAULT 'qikink',
ALTER COLUMN provider SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'order_status'::regtype
        AND enumlabel = 'SENT_TO_PROVIDER'
    ) THEN
      ALTER TYPE order_status ADD VALUE 'SENT_TO_PROVIDER';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'order_status'::regtype
        AND enumlabel = 'IN_PRODUCTION'
    ) THEN
      ALTER TYPE order_status ADD VALUE 'IN_PRODUCTION';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'order_status'::regtype
        AND enumlabel = 'OUT_FOR_DELIVERY'
    ) THEN
      ALTER TYPE order_status ADD VALUE 'OUT_FOR_DELIVERY';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum
      WHERE enumtypid = 'order_status'::regtype
        AND enumlabel = 'REFUNDED'
    ) THEN
      ALTER TYPE order_status ADD VALUE 'REFUNDED';
    END IF;
  END IF;
END $$;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS order_status_check,
DROP CONSTRAINT IF EXISTS orders_status_magic_check_v2;

ALTER TABLE orders
ALTER COLUMN status TYPE TEXT USING status::TEXT;

UPDATE orders
SET status = CASE status
  WHEN 'CREATED' THEN 'CREATED'
  WHEN 'PAYMENT_PENDING' THEN 'CREATED'
  WHEN 'PAYMENT_AUTHORIZED' THEN 'PAID'
  WHEN 'PAID' THEN 'PAID'
  WHEN 'FULFILLMENT_PENDING' THEN 'PAID'
  WHEN 'NEEDS_REVIEW' THEN 'PAID'
  WHEN 'SHIPPED' THEN 'SHIPPED'
  WHEN 'OUT_FOR_DELIVERY' THEN 'OUT_FOR_DELIVERY'
  WHEN 'DELIVERED' THEN 'DELIVERED'
  WHEN 'REFUNDED' THEN 'REFUNDED'
  WHEN 'DISPUTED' THEN 'REFUNDED'
  WHEN 'FAILED' THEN 'CANCELLED'
  WHEN 'ABANDONED' THEN 'CANCELLED'
  WHEN 'CANCELLED' THEN 'CANCELLED'
  ELSE 'CREATED'
END;

ALTER TABLE orders
ALTER COLUMN status TYPE order_status USING status::order_status;

ALTER TABLE orders
ALTER COLUMN status SET DEFAULT 'CREATED';

ALTER TABLE orders
ADD CONSTRAINT orders_status_unified_check CHECK (
  status::text = ANY (
    ARRAY[
      'CREATED',
      'PAID',
      'SENT_TO_PROVIDER',
      'IN_PRODUCTION',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED'
    ]::text[]
  )
);

CREATE INDEX IF NOT EXISTS idx_orders_provider ON orders(provider);
CREATE INDEX IF NOT EXISTS idx_orders_provider_order_id ON orders(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
