-- Add product attribute fields for fabric, GSM, fit type, and print type
-- Migration: 20260305003000_add_product_attributes

ALTER TABLE products
ADD COLUMN IF NOT EXISTS fabric text,
ADD COLUMN IF NOT EXISTS gsm numeric,
ADD COLUMN IF NOT EXISTS fit_type text,
ADD COLUMN IF NOT EXISTS print_type text;

-- Add comments for documentation
COMMENT ON COLUMN products.fabric IS 'Fabric material (e.g., Cotton, Polyester, Cotton Blend)';
COMMENT ON COLUMN products.gsm IS 'Grams per square meter - fabric weight';
COMMENT ON COLUMN products.fit_type IS 'Fit type (e.g., Slim Fit, Regular Fit, Oversized)';
COMMENT ON COLUMN products.print_type IS 'Print/decoration type (e.g., Screen Print, DTG, Embroidery)';
