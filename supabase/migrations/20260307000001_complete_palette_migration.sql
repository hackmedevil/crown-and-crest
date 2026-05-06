-- Complete Migration: Add Palette to Products and Populate Color Groups
-- Created: March 7, 2026
-- Purpose: Add palette_id to products and automatically create color_groups from assigned palettes

-- ============================================================================
-- PART 1: ADD PALETTE_ID TO PRODUCTS
-- ============================================================================

-- Add the palette_id column
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

-- Set default palette for all existing products
-- This assigns "Regular TShirts" palette to all products that don't have one
UPDATE products
SET palette_id = (SELECT id FROM color_palettes WHERE name = 'Regular TShirts' LIMIT 1)
WHERE palette_id IS NULL;

-- ============================================================================
-- PART 2: POPULATE COLOR_GROUPS FROM ASSIGNED PALETTES
-- ============================================================================

-- Create color_groups for each product based on its assigned palette
-- This creates one color_group entry for each color in the product's palette
INSERT INTO color_groups (product_id, color_id, color_name, hex_code, enabled, position)
SELECT 
    p.id as product_id,
    c.id as color_id,
    c.name as color_name,
    c.hex_code as hex_code,
    true as enabled,
    COALESCE(c.display_order, 
        ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY c.name)
    ) as position
FROM products p
JOIN colors c ON c.palette_id = p.palette_id
WHERE p.palette_id IS NOT NULL
    -- Don't duplicate if color_group already exists
    AND NOT EXISTS (
        SELECT 1 FROM color_groups cg 
        WHERE cg.product_id = p.id 
        AND cg.color_id = c.id
    )
ORDER BY p.id, c.display_order, c.name;

-- ============================================================================
-- PART 3: LINK VARIANTS TO COLOR_GROUPS
-- ============================================================================

-- Update variants to link them to their color_groups
-- This matches variants to color_groups based on the Color attribute in variant_attributes
UPDATE variants
SET color_group_id = cg.id
FROM color_groups cg
WHERE variants.product_id = cg.product_id
    AND variants.color_group_id IS NULL
    AND EXISTS (
        SELECT 1 FROM variant_attributes va
        WHERE va.variant_id = variants.id
        AND va.attribute_name = 'Color'
        AND LOWER(TRIM(cg.color_name)) = LOWER(TRIM(va.attribute_value))
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check 1: Products with palettes and color groups
SELECT 
    'Products with palette assigned' as metric,
    COUNT(*) as count
FROM products 
WHERE palette_id IS NOT NULL
UNION ALL
SELECT 
    'Products WITHOUT palette' as metric,
    COUNT(*) as count
FROM products 
WHERE palette_id IS NULL
UNION ALL
SELECT 
    'Total color_groups created' as metric,
    COUNT(*) as count
FROM color_groups
UNION ALL
SELECT 
    'Products with color_groups' as metric,
    COUNT(DISTINCT product_id) as count
FROM color_groups
UNION ALL
SELECT 
    'Variants linked to color_groups' as metric,
    COUNT(*) as count
FROM variants
WHERE color_group_id IS NOT NULL;

-- Check 2: Detailed view of color_groups per product
SELECT 
    p.slug as product_slug,
    p.name as product_name,
    cp.name as palette_name,
    cg.color_name,
    cg.hex_code as group_hex,
    c.hex_code as palette_hex,
    COUNT(pv.id) as variant_count,
    CASE 
        WHEN cg.color_id IS NULL THEN '⚠️ NO PALETTE LINK'
        WHEN cg.hex_code != c.hex_code THEN '⚠️ HEX MISMATCH'
        ELSE '✓ OK'
    END as status
FROM color_groups cg
JOIN products p ON p.id = cg.product_id
LEFT JOIN color_palettes cp ON cp.id = p.palette_id
LEFT JOIN colors c ON c.id = cg.color_id
LEFT JOIN variants pv ON pv.color_group_id = cg.id
WHERE cg.enabled = true
GROUP BY p.slug, p.name, cp.name, cg.id, cg.color_name, cg.hex_code, c.hex_code, cg.color_id
ORDER BY p.slug, cg.position;

-- Check 3: Variants that couldn't be matched to color_groups
-- These are variants with Color attributes that don't match any color in the palette
SELECT 
    p.slug as product_slug,
    p.name as product_name,
    cp.name as palette_name,
    va.attribute_value as variant_color,
    'No matching color in palette' as issue
FROM variants pv
JOIN products p ON p.id = pv.product_id
LEFT JOIN color_palettes cp ON cp.id = p.palette_id
JOIN variant_attributes va ON va.variant_id = pv.id
WHERE va.attribute_name = 'Color'
    AND pv.color_group_id IS NULL
    AND pv.enabled = true
GROUP BY p.slug, p.name, cp.name, va.attribute_value
ORDER BY p.slug, va.attribute_value;
