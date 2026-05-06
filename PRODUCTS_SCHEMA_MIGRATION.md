# Products Schema Extension - Migration Guide

## Overview

This migration extends the `products` table with metadata columns required for:
- **Product badges** (New, Bestseller, Sale)
- **Popularity sorting** (ranking_score)
- **Analytics tracking** (views, purchases, wishlists)

## What This Migration Does

### ✅ Adds 7 New Columns

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `is_new` | BOOLEAN | FALSE | Shows "New" badge on product cards |
| `is_bestseller` | BOOLEAN | FALSE | Shows "Bestseller" badge, enables bestseller filter |
| `is_on_sale` | BOOLEAN | FALSE | Shows "Sale" badge on discounted products |
| `view_count` | INTEGER | 0 | Tracks product detail page views |
| `purchase_count` | INTEGER | 0 | Tracks completed purchases |
| `wishlist_count` | INTEGER | 0 | Tracks wishlist additions |
| `ranking_score` | NUMERIC | 0 | Computed popularity score (0-1000) |

### ✅ Adds 7 Performance Indexes

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `idx_products_category_filter` | category_id | Category filtering on shop page |
| `idx_products_price` | base_price | Price range filtering |
| `idx_products_ranking` | ranking_score DESC | Popularity sorting |
| `idx_products_newest` | created_at DESC | Newest sorting |
| `idx_products_bestseller` | is_bestseller, ranking_score DESC | Bestseller filtering + sorting |
| `idx_products_new` | is_new, created_at DESC | New products filtering + sorting |
| `idx_products_sale` | is_on_sale, base_price | Sale products filtering + sorting |

### ✅ Adds 4 Safety Constraints

- `view_count` must be >= 0
- `purchase_count` must be >= 0
- `wishlist_count` must be >= 0
- `ranking_score` must be between 0 and 1000

### ✅ Auto-Initialization

Products created in the last 30 days are automatically marked as `is_new = TRUE`.

---

## Safety Guarantees

✅ **No data loss** - Only adds columns, never modifies or removes
✅ **Idempotent** - Safe to run multiple times (uses IF NOT EXISTS)
✅ **No downtime** - Online schema change
✅ **Backward compatible** - Existing queries continue to work

---

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire content of:
   ```
   supabase\migrations\20260308006_extend_products_metadata.sql
   ```
3. Paste into SQL Editor
4. Click **"Run"**
5. Wait for success message (shows ✅ confirmations)

### Option 2: Supabase CLI

```bash
# Push all pending migrations
supabase db push

# Or push this specific migration
supabase db push --file supabase/migrations/20260308006_extend_products_metadata.sql
```

### Option 3: PowerShell Helper Script

```powershell
# Run the guided migration script
.\scripts\apply-products-migration.ps1
```

---

## Verification

After applying the migration, run verification queries to confirm success.

### Quick Verification (Supabase Dashboard)

1. Open **SQL Editor**
2. Copy queries from:
   ```
   scripts\verify-products-schema.sql
   ```
3. Run each query to verify:
   - All columns exist
   - All indexes created
   - Constraints applied
   - Sample data displays correctly

### Expected Results

**Query 1 - List Columns:**
```
column_name       | data_type | status
------------------|-----------|-------
is_new            | boolean   | ✅ NEW
is_bestseller     | boolean   | ✅ NEW
is_on_sale        | boolean   | ✅ NEW
view_count        | integer   | ✅ NEW
purchase_count    | integer   | ✅ NEW
wishlist_count    | integer   | ✅ NEW
ranking_score     | numeric   | ✅ NEW
```

**Query 2 - List Indexes:**
```
index_name                     | status
-------------------------------|-------
idx_products_category_filter   | ✅ NEW
idx_products_price             | ✅ NEW
idx_products_ranking           | ✅ NEW
idx_products_newest            | ✅ NEW
idx_products_bestseller        | ✅ NEW
idx_products_new               | ✅ NEW
idx_products_sale              | ✅ NEW
```

**Query 5 - Badge Counts:**
```
new_products | bestsellers | sale_products | total_active_products
-------------|-------------|---------------|---------------------
12           | 0           | 0             | 145
```

---

## Final Products Table Schema

After migration, the `products` table will have these columns:

### Core Columns (Existing)
- `id` (uuid, primary key)
- `name` (text)
- `slug` (text, unique)
- `base_price` (numeric)
- `mrp` (numeric)
- `image_url` (text)
- `category_id` (uuid)
- `rating` (numeric)
- `review_count` (integer)
- `stock_quantity` (integer)
- `status` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Metadata Columns (NEW ✅)
- `is_new` (boolean)
- `is_bestseller` (boolean)
- `is_on_sale` (boolean)
- `view_count` (integer)
- `purchase_count` (integer)
- `wishlist_count` (integer)
- `ranking_score` (numeric)

---

## Impact on Application

### Before Migration ❌
- Shop page: Missing column errors in logs
- Sorting: Falls back to `created_at` for all options
- Badges: Cannot display "New", "Bestseller", "Sale" labels
- Analytics: No tracking of views, purchases, wishlists

### After Migration ✅
- Shop page: All queries work without errors
- Sorting: Can use popularity, bestseller, newest
- Badges: Can display all badge types
- Analytics: Full tracking enabled

---

## Next Steps After Migration

### 1. Update Shop Page (Re-enable Features)

**File:** `src/app/(storefront)/shop/page.tsx`

#### Re-enable Category Filtering
```typescript
// Lines ~56-59: Remove comment, replace with:
if (params.category) {
  const { data: cat } = await supabaseServer
    .from('categories')
    .select('id')
    .eq('slug', params.category)
    .single()
  
  if (cat?.id) {
    query = query.eq('category_id', cat.id)
  }
}
```

#### Update Sorting Logic
```typescript
// Lines ~80-104: Update switch cases to use new columns
switch (params.sort) {
  case 'popularity':
    query = query.order('ranking_score', { ascending: false })
    break
  case 'bestseller':
    query = query.eq('is_bestseller', true).order('ranking_score', { ascending: false })
    break
  case 'newest':
    query = query.order('created_at', { ascending: false })
    break
  // ... rest of cases
}
```

### 2. Optimize Price Range Query

**File:** `src/app/(storefront)/shop/page.tsx`

```typescript
// Lines ~115-135: Replace with aggregation
async function getPriceRange() {
  const { data } = await supabaseServer
    .from('products')
    .select('MIN(base_price)::numeric as min, MAX(base_price)::numeric as max')
    .eq('status', 'active')
    .single()
  
  return { 
    min: Math.floor(data?.min || 0),
    max: Math.ceil(data?.max || 10000)
  }
}
```

### 3. Start Tracking Analytics

Increment counters when:
- **view_count**: User visits product detail page
- **purchase_count**: Order is completed
- **wishlist_count**: Product added to wishlist

Example:
```typescript
// In product detail page
await supabaseServer
  .from('products')
  .update({ view_count: sql`view_count + 1` })
  .eq('id', productId)
```

### 4. Implement Ranking Algorithm

Create a function to compute `ranking_score` based on:
- Recent views (weighted by recency)
- Purchase count
- Wishlist count
- Rating
- Review count

Run periodically (e.g., daily cron job) to update scores.

---

## Rollback (If Needed)

If you need to remove these changes:

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_products_category_filter;
DROP INDEX IF EXISTS idx_products_price;
DROP INDEX IF EXISTS idx_products_ranking;
DROP INDEX IF EXISTS idx_products_newest;
DROP INDEX IF EXISTS idx_products_bestseller;
DROP INDEX IF EXISTS idx_products_new;
DROP INDEX IF EXISTS idx_products_sale;

-- Drop constraints
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_view_count_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_purchase_count_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_wishlist_count_positive;
ALTER TABLE products DROP CONSTRAINT IF EXISTS chk_ranking_score_range;

-- Drop columns
ALTER TABLE products 
  DROP COLUMN IF EXISTS is_new,
  DROP COLUMN IF EXISTS is_bestseller,
  DROP COLUMN IF EXISTS is_on_sale,
  DROP COLUMN IF EXISTS view_count,
  DROP COLUMN IF EXISTS purchase_count,
  DROP COLUMN IF EXISTS wishlist_count,
  DROP COLUMN IF EXISTS ranking_score;
```

---

## Files Created

1. **Migration:**
   - `supabase/migrations/20260308006_extend_products_metadata.sql`

2. **Verification:**
   - `scripts/verify-products-schema.sql`

3. **Helper Script:**
   - `scripts/apply-products-migration.ps1`

4. **Documentation:**
   - `PRODUCTS_SCHEMA_MIGRATION.md` (this file)

---

## Support

- **Migration fails:** Check Supabase logs for detailed error
- **Queries still fail:** Run verification script to confirm all columns exist
- **Need help:** See `PRODUCT_SHOP_AUDIT.md` for full context

---

**Created:** 2026-03-08  
**Status:** Ready for production ✅
