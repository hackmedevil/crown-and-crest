-- Add palette_id to products table
-- This allows each product to be assigned a specific color palette

-- Add the column
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS palette_id UUID;

-- Add foreign key constraint
ALTER TABLE products
  ADD CONSTRAINT fk_products_palette_id 
    FOREIGN KEY (palette_id) 
    REFERENCES color_palettes(id) 
    ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_palette_id ON products(palette_id);

-- Add comment
COMMENT ON COLUMN products.palette_id IS 'Color palette assigned to this product. All colors from this palette will be available for variants.';

-- Set default palette for existing products (optional - comment out if you want to assign manually)
-- This sets all existing products to use "Regular TShirts" palette
UPDATE products
SET palette_id = (SELECT id FROM color_palettes WHERE name = 'Regular TShirts' LIMIT 1)
WHERE palette_id IS NULL;
