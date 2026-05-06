-- Add customer_name to orders for richer admin/customer display.
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS customer_name TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
