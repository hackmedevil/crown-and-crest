-- Add shipping charge fields for product pricing
-- Migration: 20260305004000_add_shipping_charge_fields

ALTER TABLE products
ADD COLUMN IF NOT EXISTS shipping_charge numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_included_in_price boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN products.shipping_charge IS 'Shipping charge amount for this product';
COMMENT ON COLUMN products.shipping_included_in_price IS 'Whether shipping charge is included in the selling price';
