-- Migration: Populate color_groups from each Product's assigned Color Palette
-- This script creates color_groups for all products based on their palette_id

-- Step 1: Preview - Check which products have palettes assigned
-- Shows what will be created for each product
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.slug as product_slug,
    cp.name as palette_name,
    COUNT(c.id) as colors_that_will_be_added
FROM products p
LEFT JOIN color_palettes cp ON cp.id = p.palette_id
LEFT JOIN colors c ON c.palette_id = p.palette_id
GROUP BY p.id, p.name, p.slug, cp.name
ORDER BY 
    CASE WHEN p.palette_id IS NULL THEN 1 ELSE 0 END,
    p.name;

-- Step 2: Create color_groups for ALL products using their assigned palette
-- Only creates for products that HAVE a palette_id assigned
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
WHERE p.palette_id IS NOT NULL  -- Only products with assigned palette
    -- Don't duplicate if already exists
    AND NOT EXISTS (
        SELECT 1 FROM color_groups cg 
        WHERE cg.product_id = p.id 
        AND cg.color_id = c.id
    )
ORDER BY p.id, c.display_order, c.name;

-- Step 3: Update variants to link to their color_groups
-- This updates the color_group_id foreign key on product_variants
UPDATE product_variants pv
SET color_group_id = cg.id
FROM variant_attributes va
JOIN color_groups cg ON 
    cg.product_id = pv.product_id 
    AND LOWER(TRIM(cg.color_name)) = LOWER(TRIM(va.attribute_value))
WHERE va.variant_id = pv.id
    AND va.attribute_name = 'Color'
    AND pv.color_group_id IS NULL;

-- Step 4: Verify the migration
-- Check that color_groups were created and variants linked
SELECT 
    p.slug as product_slug,
    p.name as product_name,
    cg.color_name,
    cg.hex_code,
    c.name as palette_color_name,
    c.hex_code as palette_hex_code,
    COUNT(pv.id) as variant_count,
    CASE 
        WHEN cg.color_id IS NULL THEN '⚠️ NO PALETTE LINK'
        WHEN cg.hex_code != c.hex_code THEN '⚠️ HEX MISMATCH'
        ELSE '✓ OK'
    END as status
FROM color_groups cg
JOIN products p ON p.id = cg.product_id
LEFT JOIN colors c ON c.id = cg.color_id
LEFT JOIN product_variants pv ON pv.color_group_id = cg.id
WHERE cg.enabled = true
GROUP BY p.slug, p.name, cg.id, cg.color_name, cg.hex_code, c.name, c.hex_code
ORDER BY p.slug, cg.position;

-- Step 5: Check for any colors that couldn't be matched to the palette
-- These need to be added to the Color Palette first
SELECT DISTINCT
    va.attribute_value as color_name,
    COUNT(DISTINCT pv.product_id) as affected_products
FROM variant_attributes va
JOIN product_variants pv ON pv.id = va.variant_id
LEFT JOIN colors c ON LOWER(TRIM(c.name)) = LOWER(TRIM(va.attribute_value))
WHERE va.attribute_name = 'Color'
    AND c.id IS NULL
GROUP BY va.attribute_value;
-- Step 5: Count how many products now have color groups
-- Also shows products WITHOUT palette assignments
SELECT 
    'Products with color groups' as status,
    COUNT(DISTINCT cg.product_id) as count
FROM color_groups cg
UNION ALL
SELECT 
    'Products WITHOUT palette assigned' as status,
    COUNT(*) as count
FROM products p
WHERE p.palette_id IS NULL;