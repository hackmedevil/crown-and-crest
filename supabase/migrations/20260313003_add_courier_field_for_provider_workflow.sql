-- Phase 2 follow-up: canonical provider shipping fields for Qikink workflow

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS courier TEXT;

UPDATE orders
SET courier = COALESCE(courier, courier_name)
WHERE courier IS NULL AND courier_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier);
