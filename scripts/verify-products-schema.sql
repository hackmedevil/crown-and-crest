-- Verification Script: Products Table Schema
-- Run this after applying migration 20260308006_extend_products_metadata.sql
-- Purpose: Confirm all columns and indexes were added successfully

-- ==============================================================================
-- QUERY 1: List ALL Columns in Products Table
-- ==============================================================================

SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable,
  CASE 
    WHEN column_name IN ('is_new', 'is_bestseller', 'is_on_sale', 'view_count', 'purchase_count', 'wishlist_count', 'ranking_score') 
    THEN '✅ NEW'
    ELSE ''
  END as status
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY 
  ordinal_position;

-- ==============================================================================
-- QUERY 2: List ALL Indexes on Products Table
-- ==============================================================================

SELECT 
  indexname AS index_name,
  indexdef AS definition,
  CASE 
    WHEN indexname IN (
      'idx_products_category_filter',
      'idx_products_price',
      'idx_products_ranking',
      'idx_products_newest',
      'idx_products_bestseller',
      'idx_products_new',
      'idx_products_sale'
    ) 
    THEN '✅ NEW'
    ELSE ''
  END as status
FROM pg_indexes
WHERE tablename = 'products'
ORDER BY indexname;

-- ==============================================================================
-- QUERY 3: Verify Constraints
-- ==============================================================================

SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'products'::regclass
  AND conname IN (
    'chk_view_count_positive',
    'chk_purchase_count_positive',
    'chk_wishlist_count_positive',
    'chk_ranking_score_range'
  );

-- ==============================================================================
-- QUERY 4: Sample Data with New Columns
-- ==============================================================================

SELECT 
  id,
  name,
  slug,
  base_price,
  is_new,
  is_bestseller,
  is_on_sale,
  view_count,
  purchase_count,
  wishlist_count,
  ranking_score,
  created_at
FROM products
WHERE status = 'active'
LIMIT 10;

-- ==============================================================================
-- QUERY 5: Count Products by Badge Type
-- ==============================================================================

SELECT 
  COUNT(*) FILTER (WHERE is_new = TRUE) as new_products,
  COUNT(*) FILTER (WHERE is_bestseller = TRUE) as bestsellers,
  COUNT(*) FILTER (WHERE is_on_sale = TRUE) as sale_products,
  COUNT(*) as total_active_products
FROM products
WHERE status = 'active';

-- ==============================================================================
-- QUERY 6: Validate Column Data Types
-- ==============================================================================

SELECT 
  'is_new' as column_name,
  data_type,
  CASE WHEN data_type = 'boolean' THEN '✅' ELSE '❌' END as valid
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'is_new'

UNION ALL

SELECT 
  'is_bestseller',
  data_type,
  CASE WHEN data_type = 'boolean' THEN '✅' ELSE '❌' END
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'is_bestseller'

UNION ALL

SELECT 
  'is_on_sale',
  data_type,
  CASE WHEN data_type = 'boolean' THEN '✅' ELSE '❌' END
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'is_on_sale'

UNION ALL

SELECT 
  'view_count',
  data_type,
  CASE WHEN data_type = 'integer' THEN '✅' ELSE '❌' END
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'view_count'

UNION ALL

SELECT 
  'purchase_count',
  data_type,
  CASE WHEN data_type = 'integer' THEN '✅' ELSE '❌' END
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'purchase_count'

UNION ALL

SELECT 
  'wishlist_count',
  data_type,
  CASE WHEN data_type = 'integer' THEN '✅' ELSE '❌' END
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'wishlist_count'

UNION ALL

SELECT 
  'ranking_score',
  data_type,
  CASE WHEN data_type = 'numeric' THEN '✅' ELSE '❌' END
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'ranking_score';

-- ==============================================================================
-- EXPECTED RESULTS SUMMARY
-- ==============================================================================

/*
QUERY 1: Should show ALL columns including these NEW ones:
  ✅ is_new (boolean)
  ✅ is_bestseller (boolean)
  ✅ is_on_sale (boolean)
  ✅ view_count (integer)
  ✅ purchase_count (integer)
  ✅ wishlist_count (integer)
  ✅ ranking_score (numeric)

QUERY 2: Should show these NEW indexes:
  ✅ idx_products_category_filter
  ✅ idx_products_price
  ✅ idx_products_ranking
  ✅ idx_products_newest
  ✅ idx_products_bestseller
  ✅ idx_products_new
  ✅ idx_products_sale

QUERY 3: Should show 4 constraints:
  ✅ chk_view_count_positive
  ✅ chk_purchase_count_positive
  ✅ chk_wishlist_count_positive
  ✅ chk_ranking_score_range

QUERY 4: Should display sample products with all new metadata fields

QUERY 5: Should show counts (at least some products marked as "new")

QUERY 6: All columns should show ✅ (valid data type)
*/
