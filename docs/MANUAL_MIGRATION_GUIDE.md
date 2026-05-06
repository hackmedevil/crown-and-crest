# Manual Database Migration Guide

## Prerequisites

Before running the migration, ensure you have:
1. Access to your Supabase project dashboard
2. The `pgvector` extension enabled (required for AI embeddings)

---

## Step 1: Enable pgvector Extension

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query and run:

```sql
-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;
```

4. Click **Run** and verify it completes successfully

---

## Step 2: Execute the Migration

1. Open the migration file: `supabase/migrations/20260305000000_enhanced_products_system.sql`
2. Copy the **entire contents** of the file
3. Go to **SQL Editor** in Supabase Dashboard
4. Create a new query
5. Paste the migration SQL
6. Click **Run**

**⚠️ Important:** The migration is designed to be idempotent (safe to run multiple times) with `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... IF NOT EXISTS` clauses.

---

## Step 3: Verify Installation

After running the migration, verify it worked by running these checks:

### Check 1: Verify New Tables Created

```sql
-- Should see: product_embeddings, variant_attributes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('product_embeddings', 'variant_attributes');
```

**Expected Output:** 2 rows (product_embeddings, variant_attributes)

---

### Check 2: Verify Product Columns Added

```sql
-- Check new columns in products table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('brand', 'status', 'ai_metadata', 'hs_code', 'country_of_origin', 'is_searchable', 'seo_keywords', 'seo_description');
```

**Expected Output:** 8 rows with the new columns

---

### Check 3: Verify Variant Columns Added

```sql
-- Check new columns in variants table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'variants'
  AND column_name IN ('barcode', 'cost_price', 'weight_grams');
```

**Expected Output:** 3 rows with the new columns

---

### Check 4: Verify RPC Functions Created

```sql
-- Check atomic stock functions exist
SELECT proname, prosrc
FROM pg_proc
WHERE proname IN ('reserve_variant_stock_atomic', 'release_variant_stock_atomic');
```

**Expected Output:** 2 rows with function names

---

### Check 5: Verify Indexes Created

```sql
-- Check new indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename IN ('products', 'variants', 'product_embeddings', 'variant_attributes')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected Output:** 15+ indexes

---

## Step 4: Test Atomic Stock Operations

Test the new RPC functions to ensure they work:

```sql
-- 1. Create a test product (if you don't have one)
INSERT INTO products (id, name, slug, base_price, status)
VALUES ('test-product-id', 'Test Product', 'test-product', 99.99, 'draft')
ON CONFLICT (slug) DO NOTHING;

-- 2. Create a test variant
INSERT INTO variants (id, product_id, stock_quantity, sku)
VALUES ('test-variant-id', 'test-product-id', 100, 'TEST-SKU-001')
ON CONFLICT (sku) DO UPDATE SET stock_quantity = 100;

-- 3. Test reserve operation (should reserve 10 units)
SELECT reserve_variant_stock_atomic('test-variant-id', 10);

-- 4. Verify stock decreased
SELECT id, stock_quantity, reserved_quantity, sku
FROM variants
WHERE id = 'test-variant-id';
-- Expected: stock_quantity = 90, reserved_quantity = 10

-- 5. Test release operation (should release 5 units)
SELECT release_variant_stock_atomic('test-variant-id', 5);

-- 6. Verify stock updated
SELECT id, stock_quantity, reserved_quantity, sku
FROM variants
WHERE id = 'test-variant-id';
-- Expected: stock_quantity = 95, reserved_quantity = 5

-- 7. Cleanup test data
DELETE FROM variants WHERE id = 'test-variant-id';
DELETE FROM products WHERE id = 'test-product-id';
```

---

## Step 5: Test Flexible Variant Attributes

Test the new variant_attributes table:

```sql
-- 1. Get any existing variant ID
SELECT id, sku FROM variants LIMIT 1;

-- 2. Insert flexible attributes (replace <variant-id> with actual ID)
INSERT INTO variant_attributes (variant_id, attribute_name, attribute_value, display_order)
VALUES 
  ('<variant-id>', 'size', 'Large', 1),
  ('<variant-id>', 'color', 'Blue', 2),
  ('<variant-id>', 'material', 'Cotton', 3);

-- 3. Query attributes for variant
SELECT attribute_name, attribute_value, display_order
FROM variant_attributes
WHERE variant_id = '<variant-id>'
ORDER BY display_order;

-- 4. Cleanup test attributes
DELETE FROM variant_attributes WHERE variant_id = '<variant-id>';
```

---

## Troubleshooting

### Error: "extension vector does not exist"

**Solution:** Enable pgvector extension first (Step 1)

---

### Error: "column already exists"

**Solution:** The migration is idempotent. You can safely run it again. If specific columns fail, they may already exist from a previous migration.

---

### Error: "function already exists"

**Solution:** Use `CREATE OR REPLACE FUNCTION` instead of `CREATE FUNCTION`. The migration file already uses this.

---

### Error: "relation does not exist"

**Solution:** Ensure your `products` and `variants` tables exist. Run:

```sql
SELECT * FROM products LIMIT 1;
SELECT * FROM variants LIMIT 1;
```

If these fail, you need to create the base schema first.

---

## Alternative: Step-by-Step Migration

If you prefer to run the migration in smaller chunks, execute each section separately:

### Section 1: Product Embeddings Table
```sql
-- Copy lines 9-36 from migration file
```

### Section 2: Variant Attributes Table
```sql
-- Copy lines 38-61 from migration file
```

### Section 3: Product Images Table
```sql
-- Copy lines 63-93 from migration file
```

### Section 4: Product Extensions
```sql
-- Copy lines 95-160 from migration file
```

### Section 5: Variant Extensions
```sql
-- Copy lines 162-190 from migration file
```

### Section 6: Atomic Stock Functions
```sql
-- Copy lines 192-307 from migration file
```

### Section 7: Performance Indexes
```sql
-- Copy lines 309-398 from migration file
```

### Section 8: RLS Policies
```sql
-- Copy lines 400-453 from migration file
```

### Section 9: Updated At Triggers
```sql
-- Copy lines 455-483 from migration file
```

---

## Post-Migration Checklist

- [ ] All 5 verification queries pass
- [ ] Atomic stock operations test successful
- [ ] Flexible attributes test successful
- [ ] No errors in Supabase logs
- [ ] Application connects successfully
- [ ] Test product creation through API works

---

## Need Help?

If you encounter issues:

1. Check Supabase Dashboard → Logs for error details
2. Verify pgvector extension is enabled: `SELECT * FROM pg_available_extensions WHERE name = 'vector';`
3. Check current schema: `\dt` in SQL Editor
4. Review existing columns: `\d products` and `\d variants`

---

**Migration File Location:** `supabase/migrations/20260305000000_enhanced_products_system.sql`

**Total Lines:** 483 lines

**Estimated Execution Time:** 5-10 seconds
