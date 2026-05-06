-- Query to verify Color Palette hex codes and color_groups relationships
-- Run this in Supabase SQL Editor to check your data

-- 1. Check all Color Palette colors with their hex codes
SELECT 
    c.id,
    c.name,
    c.hex_code,
    p.name as palette_name
FROM colors c
LEFT JOIN color_palettes p ON c.palette_id = p.id
ORDER BY p.name, c.name;

-- 2. Check color_groups and their palette color references
SELECT 
    cg.id,
    cg.color_name,
    cg.hex_code as denormalized_hex,
    c.name as palette_color_name,
    c.hex_code as palette_hex,
    p.slug as product_slug
FROM color_groups cg
LEFT JOIN colors c ON cg.color_id = c.id
LEFT JOIN products p ON cg.product_id = p.id
WHERE cg.enabled = true
ORDER BY p.slug, cg.position;

-- 3. Check for mismatches between denormalized and palette hex codes
SELECT 
    p.slug as product_slug,
    cg.color_name,
    cg.hex_code as denormalized_hex,
    c.hex_code as palette_hex,
    CASE 
        WHEN cg.hex_code != c.hex_code THEN '⚠️ MISMATCH'
        WHEN cg.color_id IS NULL THEN '⚠️ NO PALETTE LINK'
        ELSE '✓ OK'
    END as status
FROM color_groups cg
LEFT JOIN colors c ON cg.color_id = c.id
LEFT JOIN products p ON cg.product_id = p.id
WHERE cg.enabled = true
ORDER BY status, p.slug;
