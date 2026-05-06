# Product & Shop Page Audit Report

## Executive Summary
**Status:** ⚠️ **ISSUES FOUND** — Multiple data consistency and filtering issues identified

**Critical Issues:** 3  
**Warnings:** 5  
**Info:** 4

---

## 1. SHOP PAGE AUDIT

### 1.1 Data Fetching Issues ❌

#### Issue: Missing Category Filtering
- **Location:** `src/app/(storefront)/shop/page.tsx:56-59`
- **Problem:** Category filter is disabled
  ```typescript
  // Apply filters - Skip category filter since params.category is a slug, not a UUID
  // Category filtering is handled on the client side via sidebar
  ```
- **Impact:** Category parameter in URL is ignored; filtering only works client-side (not server-side)
- **Severity:** MEDIUM
- **Fix:** Need to fetch category by slug, get UUID, then filter products

#### Issue: Pagination Mismatch
- **Location:** `src/app/(storefront)/shop/page.tsx:103-104`
- **Problem:** Products fetched with `range()` but may not match grid layout
- **Impact:** Product count may not align with actual rendered items
- **Severity:** LOW
- **Status:** Works but could be optimized

#### Issue: Price Range Query Inefficiency
- **Location:** `src/app/(storefront)/shop/page.tsx:115-135`
- **Problem:** Two separate database queries to find min/max prices
  ```typescript
  // Query 1: Get minimum price
  // Query 2: Get maximum price
  ```
- **Impact:** Unnecessary database calls (2 min queries + products query = 3 calls)
- **Severity:** MEDIUM
- **Fix:** Use `MIN()` and `MAX()` aggregates in single query, or use cached metadata

---

### 1.2 Sorting Issues ⚠️

#### Issue: Non-Existent Column References (FIXED)
- **Status:** ✅ FIXED
- **Previous:** Referenced `discount_percentage`, `ranking_score`, `view_count`, `is_bestseller` (all missing)
- **Current:** Falls back to `created_at` for most sorts
- **Issue:** "Popularity" sort uses `created_at` instead of meaningful metric
- **Recommendation:** Add `view_count` column or use `review_count` proxy

---

### 1.3 Component Structure

#### ProductGrid Component ✅
- **File:** `src/components/shop/ProductGrid.tsx`
- **Status:** Proper empty state handling
- **Renders:** `grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
- **Found Issue:** Uses `prefetchOnHover` prop — verify ProductCard supports this

#### Shop Component Chain
```
ShopPage (server)
  ├─ ShopClientWrapper (client)
  │   ├─ CategoryHeader (static)
  │   ├─ FiltersSidebar (client)
  │   ├─ SortBar (client)
  │   ├─ ProductGrid (server data)
  │   └─ Pagination
```

---

## 2. PRODUCT DETAIL PAGE AUDIT

### 2.1 Product Fetching ✅

#### getProductForPDP Function
- **File:** `src/lib/products/getProductForPDP.ts`
- **Status:** Using `cache()` wrapper — correctly memoized
- **Metadata:** Generated server-side with proper OG tags
- **Issue:** Not found scenario returns `notFound()` — correct behavior

---

### 2.2 Related Products Query ⚠️

#### Issue: Missing Columns in SELECT
- **Location:** `src/app/(storefront)/product/[slug]/page.tsx:54-57`
- **Query:**
  ```typescript
  .select('id, name, slug, base_price, mrp, image_url, is_active, rating, review_count, category')
  ```
- **Problem:** References `category` field but products table has `category_id` (relationship)
- **Severity:** MEDIUM
- **Impact:** Related products may return null for category field
- **Fix:** Change `category` → `category_id` or use join

#### Issue: No Limit on Tags
- **Status:** ⚠️ WARNING
- **Problem:** If product has many tags, query could return all related items
- **Current:** Uses `limit(8)` for items, but tags array is uncapped

---

### 2.3 Component Structure ✅

#### ProductDetailPageClient
- **File:** `src/components/product/ProductDetailPageClient.tsx`
- **Status:** Proper client-side state management
- **Features:** 
  - Variant selection (color + size)
  - Quantity control
  - Add to cart + wishlist
  - Cart context integration

#### Subcomponents
- ✅ `Breadcrumb.tsx` — Navigation hierarchy
- ✅ `ProductGallery.tsx` — Image zoom + swipe
- ✅ `ProductInfo.tsx` — Price, rating, stock
- ✅ `ProductDescription.tsx` — Tabbed details
- ✅ `ReviewsSection.tsx` — Lazy-loaded reviews
- ✅ `FrequentlyBoughtTogether.tsx` — Upsell products
- ✅ `AddToCartButton.tsx` — With wishlist toggle
- ✅ `ShippingInfo.tsx` — Trust badges
- ✅ `VariantSelector.tsx` — Size/color picker
- ⚠️ `RelatedProducts.tsx` — See data issues above

---

## 3. DATABASE SCHEMA AUDIT

### Current Issues with Products Table

| Column | Type | Status | Notes |
|--------|------|--------|-------|
| `id` | UUID | ✅ | Primary key |
| `name` | text | ✅ | Product name |
| `slug` | text | ✅ | URL-friendly |
| `base_price` | numeric | ✅ | Used in filtering |
| `mrp` | numeric | ✅ | Original price |
| `image_url` | text | ✅ | Hero image |
| `category_id` | UUID | ✅ | FK to categories |
| `rating` | numeric | ✅ | Star rating |
| `review_count` | int | ✅ | Review count |
| `stock_quantity` | int | ✅ | Inventory |
| `is_active` | boolean | ✅ | Visibility filter |
| `created_at` | timestamp | ✅ | Sorting |
| ❌ `discount_percentage` | - | **MISSING** | Referenced in sorts |
| ❌ `is_bestseller` | - | **MISSING** | Referenced in sorts |
| ❌ `is_new` | - | **MISSING** | Used in components |
| ❌ `view_count` | - | **MISSING** | Popularity sort |
| ❌ `ranking_score` | - | **MISSING** | Relevance sort |

---

## 4. TYPE SAFETY AUDIT

### GridProduct Interface ⚠️
**File:** `src/types/grid.ts`

**Extended Properties (optional):**
```typescript
discount_percentage?: number      // ❌ Not in DB
is_new?: boolean                 // ❌ Not in DB
is_bestseller?: boolean          // ❌ Not in DB
is_on_sale?: boolean             // ❌ Not in DB
hover_image_url?: string         // ❌ Not in DB
```

**Issue:** Type definitions include fields that don't exist in database
- **Impact:** Type-safe but misleading; fields will always be undefined
- **Recommendation:** Remove optional fields or add them to database

---

## 5. FILTERING SYSTEM AUDIT

### Server-Side Filters ✅
- ✅ Price range (`base_price`)
- ✅ Stock availability (`stock_quantity`)
- ✅ Rating (`rating`)
- ❌ Category (disabled — uses slug instead of UUID)

### Client-Side Filters (ShopClientWrapper)
- ⚠️ Category filtering (applies after fetch)
- ⚠️ Size filtering (not integrated with server)
- ⚠️ Color filtering (not integrated with server)

**Issue:** Filters apply AFTER fetching all products → wasteful for large catalogs

---

## 6. PERFORMANCE AUDIT

### Query Counts Per Page Load
```
Shop Page:
  ├─ getProducts()      → 1 query (all active products)
  ├─ getCategory()      → 1 query (optional)
  └─ getPriceRange()    → 2 queries (min + max)
  Total: 4 queries minimum

Product Detail Page:
  ├─ getProductForPDP() → 1-2 queries (product + variants)
  ├─ getRelatedProducts()→1 query (with possible join)
  └─ generateMetadata()  → 1 query (reuses cache)
  Total: 2-3 queries
```

### N+1 Problem
- **Location:** RelatedProducts component loops through 8 items
- **Issue:** If each product card fetches additional data, creates N+1
- **Status:** ✅ Not currently present (ProductCard is dumb component)

---

## 7. HYDRATION AUDIT

### Server/Client Boundary Issues
- ✅ `ShopPage` — Server (async data fetching)
- ✅ `ShopClientWrapper` — Client (useState + filters)
- ✅ `ProductDetailPageClient` — Client (variant selection)
- ✅ `AnnouncementBar` — Fixed with `mounted` state

**No issues found** ✅

---

## 8. MISSING FEATURES AUDIT

### Features Implemented
- ✅ Product search (via navigation)
- ✅ Cart management (CartContext)
- ✅ Wishlist (CartContext)
- ✅ Recently viewed (CartContext)
- ✅ Product variants (color + size)

### Features NOT Implemented
- ❌ Advanced search with full-text
- ❌ Smart sorting (popularity, trending)
- ❌ Product reviews system (API exists but not integrated)
- ❌ Frequently bought together API
- ❌ Size recommendations
- ❌ Product comparison

---

## CRITICAL ACTION ITEMS

### Priority 1: Fix Data Consistency
```typescript
// 1. Add missing boolean/numeric columns to products table:
ALTER TABLE products ADD COLUMN is_new BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN is_bestseller BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN is_on_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN ranking_score NUMERIC DEFAULT 0;
```

### Priority 2: Fix Category Filtering
```typescript
// In shop/page.tsx getProducts():
if (params.category) {
  const { data: categoryData } = await supabaseServer
    .from('categories')
    .select('id')
    .eq('slug', params.category)
    .single()
  
  if (categoryData) {
    query = query.eq('category_id', categoryData.id)
  }
}
```

### Priority 3: Optimize Price Range Query
```typescript
// Use single aggregation query:
const { data } = await supabaseServer
  .from('products')
  .select('MIN(base_price)::numeric as min_price, MAX(base_price)::numeric as max_price')
  .eq('is_active', true)
  .single()
```

### Priority 4: Integrate Client Filters with Server
- Move size/color filtering to server query
- Update QueryParams to include filter values
- Avoid fetching all products then filtering client-side

---

## RECOMMENDATIONS

### Short-term (This Sprint)
1. ✅ Fix console errors in AnnouncementBar ✓
2. ✅ Fix Products fetch error ✓
3. Add missing columns to database schema
4. Fix category filtering logic
5. Optimize price range query

### Medium-term (Next Sprint)
1. Integrate client-side filters with server queries
2. Add search functionality to shop
3. Implement pagination optimization (use cursor-based)
4. Add caching for price range and categories

### Long-term (Product Improvements)
1. Implement full-text search with ranking
2. Add product reviews system
3. Build ML-based recommendations
4. Add A/B testing framework for sort algorithms

---

## Testing Checklist

- [ ] Shop page loads 24 products
- [ ] Pagination works (page 2, 3, etc.)
- [ ] Price filter works both ways
- [ ] Stock availability filter works
- [ ] Rating filter works
- [ ] Sort dropdown changes order
- [ ] No 404s for valid products
- [ ] Related products load
- [ ] Variant selection works
- [ ] Add to cart from PDP works
- [ ] Add to cart from grid works
- [ ] Wishlist toggle works
- [ ] Recently viewed persists

---

**Last Updated:** 2026-03-08  
**Audit By:** GitHub Copilot  
**Status:** READY FOR REMEDIATION
