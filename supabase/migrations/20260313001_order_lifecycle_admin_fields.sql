-- Order lifecycle admin fields and recipient separation
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_name TEXT,
ADD COLUMN IF NOT EXISTS shipping_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS internal_notes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS order_timeline JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_shipping_name ON orders(shipping_name);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_phone ON orders(shipping_phone);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
