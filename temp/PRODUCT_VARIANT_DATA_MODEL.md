# Product and Variant Data Model

## Overview

A scalable, normalized data model separating **Products** (style-level) from **Variants** (SKU-level) for fashion e-commerce.

**Example:**
- **Product:** "Premium Cotton T-Shirt"
  - **Variants:**
    - Small, White, $29.99, Stock: 15
    - Small, Black, $29.99, Stock: 8
    - Medium, White, $29.99, Stock: 0 (Out of stock)
    - Large, White, $34.99, Stock: 20 (Price override)

---

## 1. DATABASE SCHEMA

### Table: `products`

**Purpose:** Style-level product information (shared across all variants)

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  base_price integer NOT NULL,           -- In paise/cents (e.g., 2999 = ₹29.99)
  category text,
  tags text[],                           -- ['summer', 'casual', 'bestseller']
  images jsonb,                          -- [{"url": "...", "alt": "..."}, ...]
  published boolean DEFAULT false,
  featured boolean DEFAULT false,        -- For homepage/collections
  meta_title text,                       -- SEO
  meta_description text,                 -- SEO
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_published ON products(published);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_tags ON products USING gin(tags);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;

-- Full-text search index
CREATE INDEX idx_products_search ON products USING gin(
  to_tsvector('english', name || ' ' || coalesce(description, ''))
);

-- Updated timestamp trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Key Fields:**
- `slug` - SEO-friendly URL (e.g., `premium-cotton-t-shirt`)
- `base_price` - Default price (can be overridden per variant)
- `images` - Product-level images (hero shots)
- `published` - Hide unpublished products from storefront
- `tags` - Flexible categorization for filtering

---

### Table: `variants`

**Purpose:** SKU-level inventory and pricing

```sql
CREATE TABLE variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,              -- e.g., 'TSHIRT-SM-WHT-001'
  
  -- Variant attributes
  size text NOT NULL,                    -- 'XS', 'S', 'M', 'L', 'XL', 'XXL'
  color text NOT NULL,                   -- 'White', 'Black', 'Navy'
  price_override integer,                -- Override base_price if set
  
  -- Inventory
  stock_quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer DEFAULT 5, -- Alert when stock <= threshold
  
  -- Variant-specific data
  images jsonb,                          -- Color-specific images
  weight integer,                        -- In grams (for shipping)
  enabled boolean DEFAULT true,          -- Disable without deleting
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT variants_stock_non_negative CHECK (stock_quantity >= 0),
  CONSTRAINT variants_price_override_positive CHECK (price_override IS NULL OR price_override > 0)
);

-- Indexes for performance
CREATE INDEX idx_variants_product_id ON variants(product_id);
CREATE INDEX idx_variants_sku ON variants(sku);
CREATE INDEX idx_variants_enabled ON variants(enabled) WHERE enabled = true;
CREATE INDEX idx_variants_low_stock ON variants(stock_quantity) 
  WHERE stock_quantity <= low_stock_threshold AND enabled = true;

-- Unique constraint: one variant per product+size+color combo
CREATE UNIQUE INDEX idx_variants_unique_combo 
  ON variants(product_id, size, color);

-- Updated timestamp trigger
CREATE TRIGGER update_variants_updated_at
  BEFORE UPDATE ON variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Key Fields:**
- `sku` - Unique identifier for inventory tracking
- `size` + `color` - Variant attributes (unique per product)
- `price_override` - If set, overrides product's `base_price`
- `stock_quantity` - Real-time inventory
- `low_stock_threshold` - Trigger alerts when stock is low
- `enabled` - Soft delete (hide from storefront without losing data)

---

### Table: `categories` (Optional, Future)

**Purpose:** Hierarchical product categorization

```sql
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Example hierarchy:
-- Men (parent_id = null)
--   ├─ T-Shirts (parent_id = Men.id)
--   ├─ Shirts (parent_id = Men.id)
-- Women (parent_id = null)
--   ├─ Dresses (parent_id = Women.id)
```

**Future Enhancement:** Link products to categories via `products.category_id uuid REFERENCES categories(id)`

---

## 2. RELATIONSHIPS

```
┌─────────────────┐
│   products      │
│  (style-level)  │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐
│   variants      │
│  (SKU-level)    │
└─────────────────┘
```

**Cascade Behavior:**
- Delete product → Deletes all variants (ON DELETE CASCADE)
- Update product.id → Updates variant.product_id (automatic FK)

**Design Decisions:**
- **Why separate tables?** 
  - Products can have 10+ variants (size × color combos)
  - Inventory tracking per variant (not per product)
  - Price overrides per variant (e.g., XL costs more)
  
- **Why unique SKU?**
  - Required for warehouse/fulfillment systems
  - Enables barcode scanning
  - Prevents duplicate inventory entries

- **Why soft delete (enabled flag)?**
  - Preserve order history (past orders reference disabled variants)
  - Analytics (track discontinued variants)
  - Restore if needed (seasonal items)

---

## 3. EXAMPLE QUERIES

### Query 1: Get Product with All Variants (PDP)

**Use Case:** Product Detail Page - show product info + size/color options

```sql
-- Storefront query (public-facing)
SELECT 
  p.id,
  p.slug,
  p.name,
  p.description,
  p.base_price,
  p.images AS product_images,
  p.category,
  p.tags,
  
  -- Aggregate variants
  json_agg(
    json_build_object(
      'id', v.id,
      'sku', v.sku,
      'size', v.size,
      'color', v.color,
      'price', COALESCE(v.price_override, p.base_price),
      'in_stock', v.stock_quantity > 0,
      'stock_quantity', v.stock_quantity,
      'images', v.images
    ) ORDER BY v.size, v.color
  ) FILTER (WHERE v.enabled = true) AS variants

FROM products p
LEFT JOIN variants v ON v.product_id = p.id
WHERE p.slug = 'premium-cotton-t-shirt'
  AND p.published = true
GROUP BY p.id;
```

**Returns:**
```json
{
  "id": "uuid",
  "slug": "premium-cotton-t-shirt",
  "name": "Premium Cotton T-Shirt",
  "description": "...",
  "base_price": 2999,
  "variants": [
    {
      "id": "variant-uuid-1",
      "sku": "TSHIRT-SM-WHT",
      "size": "S",
      "color": "White",
      "price": 2999,
      "in_stock": true,
      "stock_quantity": 15
    },
    {
      "id": "variant-uuid-2",
      "sku": "TSHIRT-SM-BLK",
      "size": "S",
      "color": "Black",
      "price": 2999,
      "in_stock": true,
      "stock_quantity": 8
    },
    {
      "id": "variant-uuid-3",
      "sku": "TSHIRT-LG-WHT",
      "size": "L",
      "color": "White",
      "price": 3499,
      "in_stock": true,
      "stock_quantity": 20
    }
  ]
}
```

---

### Query 2: Check Variant Availability (Add to Cart)

**Use Case:** User selects size/color, check if in stock

```sql
-- Check if variant exists and has stock
SELECT 
  v.id,
  v.sku,
  v.size,
  v.color,
  COALESCE(v.price_override, p.base_price) AS price,
  v.stock_quantity,
  v.stock_quantity > 0 AS in_stock
FROM variants v
JOIN products p ON p.id = v.product_id
WHERE v.id = 'selected-variant-uuid'
  AND v.enabled = true
  AND p.published = true;
```

**Usage in Cart Action:**
```typescript
// src/lib/cart/actions.ts
export async function addToCart(uid: string, variantId: string, quantity: number) {
  // 1. Check variant availability
  const { data: variant } = await supabaseServer
    .from('variants')
    .select('id, sku, stock_quantity, products!inner(published)')
    .eq('id', variantId)
    .eq('enabled', true)
    .eq('products.published', true)
    .single()
  
  if (!variant || variant.stock_quantity < quantity) {
    throw new Error('Product out of stock')
  }
  
  // 2. Add to cart
  await supabaseServer.from('cart_items').insert({
    firebase_uid: uid,
    variant_id: variantId,
    quantity
  })
}
```

---

### Query 3: Low-Stock Alerts (Admin Dashboard)

**Use Case:** Admin sees products that need restock

```sql
-- Get variants below low-stock threshold
SELECT 
  p.name AS product_name,
  v.sku,
  v.size,
  v.color,
  v.stock_quantity,
  v.low_stock_threshold
FROM variants v
JOIN products p ON p.id = v.product_id
WHERE v.enabled = true
  AND v.stock_quantity <= v.low_stock_threshold
  AND p.published = true
ORDER BY v.stock_quantity ASC, p.name;
```

**Returns:**
```
| product_name            | sku              | size | color | stock | threshold |
|------------------------|------------------|------|-------|-------|-----------|
| Premium Cotton T-Shirt | TSHIRT-SM-BLK    | S    | Black | 3     | 5         |
| Denim Jacket           | JACKET-MD-BLU    | M    | Blue  | 2     | 5         |
```

---

### Query 4: Admin - Create Product with Variants

**Use Case:** Admin creates new product + multiple variants

```sql
-- Step 1: Insert product
INSERT INTO products (slug, name, description, base_price, category, images, published)
VALUES (
  'summer-linen-shirt',
  'Summer Linen Shirt',
  'Breathable linen shirt perfect for summer',
  3999,  -- ₹39.99
  'shirts',
  '[{"url": "https://...", "alt": "Summer Linen Shirt"}]'::jsonb,
  true
)
RETURNING id;

-- Step 2: Insert variants (using product.id from above)
INSERT INTO variants (product_id, sku, size, color, stock_quantity, low_stock_threshold)
VALUES
  ('product-uuid', 'LINEN-SM-WHT', 'S', 'White', 20, 5),
  ('product-uuid', 'LINEN-SM-BLU', 'S', 'Blue', 15, 5),
  ('product-uuid', 'LINEN-MD-WHT', 'M', 'White', 25, 5),
  ('product-uuid', 'LINEN-MD-BLU', 'M', 'Blue', 30, 5),
  ('product-uuid', 'LINEN-LG-WHT', 'L', 'White', 18, 5),
  ('product-uuid', 'LINEN-LG-BLU', 'L', 'Blue', 22, 5);
```

**Server Action Pattern:**
```typescript
// src/lib/admin/actions/products.ts
export async function adminCreateProduct(productData: ProductInput) {
  await requireAdmin()
  
  // 1. Create product
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .insert({
      slug: productData.slug,
      name: productData.name,
      base_price: productData.basePrice,
      description: productData.description,
      published: false  // Draft by default
    })
    .select()
    .single()
  
  if (productError) throw new Error(productError.message)
  
  // 2. Create variants
  const variantsToInsert = productData.variants.map(v => ({
    product_id: product.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    stock_quantity: v.stockQuantity,
    price_override: v.priceOverride
  }))
  
  const { error: variantsError } = await supabaseAdmin
    .from('variants')
    .insert(variantsToInsert)
  
  if (variantsError) throw new Error(variantsError.message)
  
  return product
}
```

---

### Query 5: Admin - Update Variant Inventory

**Use Case:** Admin receives restock, updates inventory

```sql
-- Update single variant stock
UPDATE variants
SET 
  stock_quantity = stock_quantity + 50,  -- Add 50 units
  updated_at = now()
WHERE sku = 'TSHIRT-SM-BLK';

-- Bulk update (e.g., from CSV import)
UPDATE variants
SET stock_quantity = v.new_stock
FROM (VALUES
  ('TSHIRT-SM-WHT', 100),
  ('TSHIRT-SM-BLK', 75),
  ('TSHIRT-MD-WHT', 120)
) AS v(sku, new_stock)
WHERE variants.sku = v.sku;
```

**Server Action:**
```typescript
export async function adminUpdateVariantStock(
  variantId: string,
  quantity: number
) {
  await requireAdmin()
  
  const { data, error } = await supabaseAdmin
    .from('variants')
    .update({ stock_quantity: quantity })
    .eq('id', variantId)
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}
```

---

### Query 6: Search Products (Storefront)

**Use Case:** User searches "cotton shirt"

```sql
SELECT 
  p.id,
  p.slug,
  p.name,
  p.base_price,
  p.images,
  
  -- Count available variants
  COUNT(v.id) FILTER (WHERE v.enabled = true AND v.stock_quantity > 0) AS available_variants,
  
  -- Lowest price among variants
  MIN(COALESCE(v.price_override, p.base_price)) AS min_price,
  
  -- Highest price among variants
  MAX(COALESCE(v.price_override, p.base_price)) AS max_price

FROM products p
LEFT JOIN variants v ON v.product_id = p.id

WHERE p.published = true
  AND to_tsvector('english', p.name || ' ' || coalesce(p.description, ''))
      @@ plainto_tsquery('english', 'cotton shirt')

GROUP BY p.id
HAVING COUNT(v.id) FILTER (WHERE v.enabled = true AND v.stock_quantity > 0) > 0
ORDER BY ts_rank(
  to_tsvector('english', p.name || ' ' || coalesce(p.description, '')),
  plainto_tsquery('english', 'cotton shirt')
) DESC
LIMIT 20;
```

---

## 4. STOREFRONT USAGE PATTERNS

### Product Listing Page (PLP)

**Query:** Get products with variant availability

```typescript
// src/lib/products/queries.ts
export async function listProducts(filters?: {
  category?: string
  minPrice?: number
  maxPrice?: number
}) {
  let query = supabaseServer
    .from('products')
    .select(`
      id,
      slug,
      name,
      base_price,
      images,
      variants!inner(
        id,
        size,
        color,
        price_override,
        stock_quantity,
        enabled
      )
    `)
    .eq('published', true)
    .eq('variants.enabled', true)
    .gt('variants.stock_quantity', 0)
  
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  
  const { data, error } = await query.limit(20)
  if (error) throw new Error(error.message)
  
  return data
}
```

**Component Usage:**
```typescript
// src/app/shop/page.tsx
export default async function ShopPage() {
  const products = await listProducts()
  
  return (
    <div className="product-grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

---

### Product Detail Page (PDP)

**Query:** Get product with all variants for selection

```typescript
// src/lib/products/queries.ts
export async function getProductBySlug(slug: string) {
  const { data, error } = await supabaseServer
    .from('products')
    .select(`
      *,
      variants (
        id,
        sku,
        size,
        color,
        price_override,
        stock_quantity,
        images,
        enabled
      )
    `)
    .eq('slug', slug)
    .eq('published', true)
    .single()
  
  if (error) throw new Error(error.message)
  
  // Filter enabled variants with stock
  data.variants = data.variants.filter(v => v.enabled && v.stock_quantity > 0)
  
  return data
}
```

**Component Usage:**
```typescript
// src/app/product/[slug]/page.tsx
export default async function ProductPage({ params }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  
  return <ProductDetailClient product={product} />
}

// Client component for variant selection
'use client'
function ProductDetailClient({ product }) {
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  
  // Find matching variant
  const selectedVariant = product.variants.find(
    v => v.size === selectedSize && v.color === selectedColor
  )
  
  const price = selectedVariant
    ? (selectedVariant.price_override || product.base_price)
    : product.base_price
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p className="price">₹{(price / 100).toFixed(2)}</p>
      
      {/* Size selector */}
      <SizeSelector 
        sizes={[...new Set(product.variants.map(v => v.size))]}
        selected={selectedSize}
        onChange={setSelectedSize}
      />
      
      {/* Color selector */}
      <ColorSelector 
        colors={[...new Set(product.variants.map(v => v.color))]}
        selected={selectedColor}
        onChange={setSelectedColor}
      />
      
      {/* Add to cart */}
      <button 
        disabled={!selectedVariant}
        onClick={() => addToCart(selectedVariant.id)}
      >
        {selectedVariant?.stock_quantity > 0 
          ? 'Add to Cart' 
          : 'Out of Stock'}
      </button>
    </div>
  )
}
```

---

## 5. ADMIN USAGE PATTERNS

### Product Management Dashboard

**Query:** List products with inventory summary

```typescript
// src/lib/admin/actions/products.ts
export async function adminListProducts() {
  await requireAdmin()
  
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      id,
      name,
      slug,
      base_price,
      published,
      created_at,
      variants (
        id,
        stock_quantity,
        enabled
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  
  // Calculate inventory stats
  return data.map(product => ({
    ...product,
    total_variants: product.variants.length,
    total_stock: product.variants.reduce((sum, v) => sum + v.stock_quantity, 0),
    low_stock_variants: product.variants.filter(v => v.stock_quantity <= 5).length
  }))
}
```

**Component:**
```typescript
// src/app/admin/products/page.tsx
export default async function AdminProductsPage() {
  const products = await adminListProducts()
  
  return (
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Variants</th>
          <th>Total Stock</th>
          <th>Low Stock</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {products.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{p.total_variants}</td>
            <td>{p.total_stock}</td>
            <td className={p.low_stock_variants > 0 ? 'text-red-600' : ''}>
              {p.low_stock_variants}
            </td>
            <td>{p.published ? 'Live' : 'Draft'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

### Variant Management (Edit Product)

**Query:** Get product with editable variants

```typescript
export async function adminGetProduct(productId: string) {
  await requireAdmin()
  
  const { data, error } = await supabaseAdmin
    .from('products')
    .select(`
      *,
      variants (*)
    `)
    .eq('id', productId)
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function adminUpdateVariant(
  variantId: string,
  updates: Partial<Variant>
) {
  await requireAdmin()
  
  const { data, error } = await supabaseAdmin
    .from('variants')
    .update(updates)
    .eq('id', variantId)
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}
```

---

## 6. FUTURE ENHANCEMENTS

### Bundles ("Shop the Look")

**New Table:** `bundles`

```sql
CREATE TABLE bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  discount_percentage integer,  -- 10 = 10% off
  images jsonb,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid REFERENCES bundles(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES variants(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1,
  UNIQUE(bundle_id, variant_id)
);
```

**Query:**
```sql
SELECT 
  b.name AS bundle_name,
  b.discount_percentage,
  json_agg(
    json_build_object(
      'product', p.name,
      'variant', v.size || ' ' || v.color,
      'price', COALESCE(v.price_override, p.base_price),
      'quantity', bi.quantity
    )
  ) AS items
FROM bundles b
JOIN bundle_items bi ON bi.bundle_id = b.id
JOIN variants v ON v.id = bi.variant_id
JOIN products p ON p.id = v.product_id
WHERE b.slug = 'summer-essentials'
GROUP BY b.id;
```

---

### Analytics: Best-Selling Variants

**Query:**
```sql
SELECT 
  p.name AS product_name,
  v.size,
  v.color,
  COUNT(oi.id) AS times_ordered,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.price * oi.quantity) AS revenue
FROM order_items oi
JOIN variants v ON v.id = oi.variant_id
JOIN products p ON p.id = v.product_id
WHERE oi.created_at >= now() - interval '30 days'
GROUP BY p.id, v.id
ORDER BY units_sold DESC
LIMIT 10;
```

---

### Stock Movement History

**New Table:** `stock_movements`

```sql
CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid REFERENCES variants(id),
  quantity_change integer NOT NULL,  -- +50 (restock), -1 (sale)
  reason text,  -- 'restock', 'sale', 'return', 'adjustment'
  notes text,
  created_by uuid,  -- Admin user who made change
  created_at timestamptz DEFAULT now()
);

-- Trigger to log stock changes
CREATE OR REPLACE FUNCTION log_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stock_quantity != OLD.stock_quantity THEN
    INSERT INTO stock_movements (variant_id, quantity_change, reason)
    VALUES (NEW.id, NEW.stock_quantity - OLD.stock_quantity, 'adjustment');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER variants_stock_movement
  AFTER UPDATE OF stock_quantity ON variants
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_movement();
```

---

## 7. DESIGN DECISIONS

### Why Separate Products and Variants?

**Alternative:** Single `products` table with size/color columns

❌ **Problems:**
- One row per size/color combo (100 rows for 10 sizes × 10 colors)
- Duplicate product info (name, description) 100 times
- Difficult to query "all sizes for this product"
- Hard to track inventory per SKU

✅ **Benefits of Separation:**
- Product info stored once
- Easy to add new variants
- Clear inventory tracking per SKU
- Efficient queries (join only when needed)

---

### Why `price_override` on Variants?

**Use Cases:**
- XL/XXL sizes cost more
- Premium colors (e.g., Gold) cost more
- Seasonal pricing (winter jackets in summer)

**Alternative:** Always use product's `base_price`

❌ **Problem:** Can't have different prices per variant

✅ **Solution:** `COALESCE(variant.price_override, product.base_price)`
- Most variants use base price (NULL override)
- Special variants set override

---

### Why `enabled` Flag on Variants?

**Use Cases:**
- Seasonal items (disable winter items in summer)
- Discontinued sizes (don't delete, preserve order history)
- A/B testing (enable/disable variants without data loss)

**Alternative:** DELETE variant rows

❌ **Problem:** 
- Past orders reference deleted variants (broken FKs)
- Can't restore if needed
- Lose historical data

✅ **Solution:** Soft delete with `enabled = false`

---

### Why Store Prices in Paise/Cents?

**Alternative:** Decimal/float columns

❌ **Problems:**
- Floating-point rounding errors
- Inconsistent precision
- Arithmetic errors in calculations

✅ **Benefits:**
- Integer math (exact calculations)
- No rounding errors
- Standard practice in payment systems

**Example:**
```typescript
// Database: 2999 (integer)
// Display: ₹29.99 (price / 100)
// Payment: 2999 paise (Razorpay expects paise)
```

---

## 8. MIGRATION FROM BASIC MODEL

**Current State:** Single `products` table (flat structure)

**Migration Steps:**

```sql
-- 1. Create new schema (products + variants tables)
-- (Use SQL from Section 1)

-- 2. Migrate existing products
-- Assume current table has: id, name, price, size, color, stock

INSERT INTO products (id, slug, name, base_price, published)
SELECT 
  gen_random_uuid(),
  lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')),
  name,
  price,
  true
FROM old_products
GROUP BY name;  -- Deduplicate by product name

-- 3. Create variants from old products
INSERT INTO variants (product_id, sku, size, color, stock_quantity)
SELECT 
  np.id,
  'MIGRATED-' || op.id,
  op.size,
  op.color,
  op.stock
FROM old_products op
JOIN new_products np ON np.name = op.name;

-- 4. Verify migration
SELECT 
  p.name,
  COUNT(v.id) AS variant_count,
  SUM(v.stock_quantity) AS total_stock
FROM products p
LEFT JOIN variants v ON v.product_id = p.id
GROUP BY p.id;
```

---

## SUMMARY

### Tables Created
1. **products** - Style-level (1 row per product)
2. **variants** - SKU-level (N rows per product)
3. **categories** - (Optional) Hierarchical categories

### Key Features
- ✅ Normalized structure (products → variants)
- ✅ Price overrides per variant
- ✅ Inventory tracking per SKU
- ✅ Low-stock alerts
- ✅ Soft delete (enabled flag)
- ✅ Full-text search
- ✅ SEO-friendly slugs
- ✅ Future-proof (bundles, analytics)

### Usage Patterns
- **Storefront:** Join products + variants for PDP, filter by availability
- **Admin:** CRUD operations on both tables, bulk inventory updates
- **Analytics:** Aggregate sales by variant, track stock movements

### Next Steps
1. Run SQL schema (Section 1)
2. Create server actions (admin and user)
3. Build PDP with variant selection UI
4. Add admin product/variant management pages
5. Implement low-stock alerts

**Model is production-ready and scalable. ✅**
