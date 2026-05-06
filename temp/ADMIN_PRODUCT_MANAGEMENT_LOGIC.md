# Admin Product & Variant Management Logic

## Overview

Server-side logic for admin product and variant management with transaction safety, validation, and error handling.

**Principles:**
- All actions require admin role
- Use database transactions for multi-step operations
- Soft-delete by default (preserve order history)
- Fail fast with clear error messages
- Atomic operations (all or nothing)

---

## 1. ADMIN ACTIONS INVENTORY

### Product Actions

| Action | Purpose | Transaction? |
|--------|---------|--------------|
| `adminCreateProduct` | Create product with initial variants | ✅ Yes |
| `adminUpdateProduct` | Update product details (name, price, etc.) | ❌ No |
| `adminPublishProduct` | Toggle product visibility | ❌ No |
| `adminDeleteProduct` | Soft-delete product and variants | ✅ Yes (check orders) |
| `adminGetProduct` | Fetch product with all variants | ❌ No |
| `adminListProducts` | List all products with stats | ❌ No |
| `adminSearchProducts` | Search products by name/SKU | ❌ No |

### Variant Actions

| Action | Purpose | Transaction? |
|--------|---------|--------------|
| `adminCreateVariant` | Add new variant to existing product | ❌ No |
| `adminUpdateVariant` | Update variant details (size, color, price) | ❌ No |
| `adminUpdateVariantStock` | Update stock quantity | ❌ No |
| `adminBulkUpdateStock` | Update multiple variants' stock | ✅ Yes |
| `adminDisableVariant` | Soft-delete variant | ✅ Yes (check orders) |
| `adminEnableVariant` | Re-enable disabled variant | ❌ No |
| `adminDeleteVariant` | Hard-delete variant (dangerous) | ✅ Yes (check orders) |

### Bulk Actions

| Action | Purpose | Transaction? |
|--------|---------|--------------|
| `adminBulkPublishProducts` | Publish multiple products | ✅ Yes |
| `adminBulkUpdatePrices` | Update prices across variants | ✅ Yes |
| `adminImportStockCSV` | Import stock from CSV | ✅ Yes |

---

## 2. ACTION SIGNATURES

### Product Management

```typescript
/**
 * Create new product with initial variants
 * 
 * Transaction: Yes (product + variants must succeed together)
 * Validation: slug unique, base_price > 0, at least 1 variant
 */
export async function adminCreateProduct(data: {
  slug: string
  name: string
  description?: string
  base_price: number
  category?: string
  tags?: string[]
  images?: Array<{ url: string; alt: string }>
  meta_title?: string
  meta_description?: string
  variants: Array<{
    sku: string
    size: string
    color: string
    stock_quantity: number
    price_override?: number
    low_stock_threshold?: number
  }>
}): Promise<Product>

/**
 * Update product details (does not affect variants)
 * 
 * Transaction: No
 * Validation: product exists, slug unique if changed
 */
export async function adminUpdateProduct(
  productId: string,
  updates: {
    slug?: string
    name?: string
    description?: string
    base_price?: number
    category?: string
    tags?: string[]
    images?: Array<{ url: string; alt: string }>
    meta_title?: string
    meta_description?: string
  }
): Promise<Product>

/**
 * Toggle product published status
 * 
 * Transaction: No
 * Validation: product exists, has at least 1 enabled variant
 */
export async function adminPublishProduct(
  productId: string,
  published: boolean
): Promise<Product>

/**
 * Soft-delete product (sets deleted_at timestamp)
 * 
 * Transaction: Yes (check orders, disable all variants)
 * Validation: no pending orders referencing this product
 */
export async function adminDeleteProduct(
  productId: string
): Promise<{ success: boolean; message: string }>

/**
 * Get product with all variants (including disabled)
 * 
 * Transaction: No
 */
export async function adminGetProduct(
  productId: string
): Promise<ProductWithVariants>

/**
 * List products with inventory stats
 * 
 * Transaction: No
 * Pagination: Yes (20 per page default)
 */
export async function adminListProducts(options?: {
  page?: number
  limit?: number
  category?: string
  published?: boolean
  search?: string
}): Promise<{
  products: Array<ProductWithStats>
  total: number
  page: number
  limit: number
}>
```

---

### Variant Management

```typescript
/**
 * Create new variant for existing product
 * 
 * Transaction: No
 * Validation: product exists, SKU unique, size+color combo unique per product
 */
export async function adminCreateVariant(data: {
  product_id: string
  sku: string
  size: string
  color: string
  stock_quantity: number
  price_override?: number
  low_stock_threshold?: number
  images?: Array<{ url: string; alt: string }>
}): Promise<Variant>

/**
 * Update variant details (not stock)
 * 
 * Transaction: No
 * Validation: variant exists, SKU unique if changed
 */
export async function adminUpdateVariant(
  variantId: string,
  updates: {
    sku?: string
    size?: string
    color?: string
    price_override?: number
    low_stock_threshold?: number
    images?: Array<{ url: string; alt: string }>
  }
): Promise<Variant>

/**
 * Update variant stock quantity
 * 
 * Transaction: No
 * Validation: variant exists, stock >= 0
 */
export async function adminUpdateVariantStock(
  variantId: string,
  quantity: number,
  reason?: string
): Promise<Variant>

/**
 * Bulk update stock for multiple variants
 * 
 * Transaction: Yes (all or nothing)
 * Validation: all variants exist, all quantities >= 0
 */
export async function adminBulkUpdateStock(
  updates: Array<{
    variant_id: string
    stock_quantity: number
  }>
): Promise<{ success: boolean; updated: number }>

/**
 * Soft-delete variant (set enabled = false)
 * 
 * Transaction: Yes (check orders)
 * Validation: no pending orders, product has other enabled variants
 */
export async function adminDisableVariant(
  variantId: string
): Promise<Variant>

/**
 * Re-enable disabled variant
 * 
 * Transaction: No
 */
export async function adminEnableVariant(
  variantId: string
): Promise<Variant>

/**
 * Hard-delete variant (dangerous, irreversible)
 * 
 * Transaction: Yes (check orders)
 * Validation: no orders ever referenced this variant
 */
export async function adminDeleteVariant(
  variantId: string,
  force?: boolean
): Promise<{ success: boolean; message: string }>
```

---

## 3. TRANSACTION PATTERNS

### When to Use Transactions

**✅ USE TRANSACTIONS:**
- Creating product with variants (must succeed together)
- Deleting products (check orders + disable variants atomically)
- Bulk operations (all or nothing)
- Operations with safety checks (check + update must be atomic)

**❌ DON'T USE TRANSACTIONS:**
- Single-row updates (update product name, update variant stock)
- Read-only operations (get, list, search)
- Operations without dependencies

---

### Transaction Pattern 1: Product Creation

**Flow:**
```
BEGIN TRANSACTION
  1. Validate input (slug unique, price > 0)
  2. Insert product
  3. Validate variants (SKUs unique, at least 1 variant)
  4. Insert all variants
  5. Check if any insert failed
     - YES → ROLLBACK
     - NO → COMMIT
END TRANSACTION
```

**Pseudocode:**
```typescript
export async function adminCreateProduct(data) {
  await requireAdmin()
  
  // Validation (before transaction)
  validateProductData(data)
  await checkSlugUnique(data.slug)
  
  // Start transaction
  const { data: product, error: productError } = await supabaseAdmin.rpc(
    'create_product_with_variants',
    {
      product_data: {
        slug: data.slug,
        name: data.name,
        base_price: data.base_price,
        // ... other fields
      },
      variants_data: data.variants
    }
  )
  
  if (productError) {
    throw new Error(`Product creation failed: ${productError.message}`)
  }
  
  return product
}
```

**Database Function:**
```sql
-- RPC function (runs in transaction automatically)
CREATE OR REPLACE FUNCTION create_product_with_variants(
  product_data jsonb,
  variants_data jsonb
) RETURNS json AS $$
DECLARE
  new_product_id uuid;
  result json;
BEGIN
  -- Insert product
  INSERT INTO products (slug, name, base_price, ...)
  SELECT * FROM jsonb_populate_record(null::products, product_data)
  RETURNING id INTO new_product_id;
  
  -- Insert variants
  INSERT INTO variants (product_id, sku, size, color, ...)
  SELECT 
    new_product_id,
    *
  FROM jsonb_populate_recordset(null::variants, variants_data);
  
  -- Return product with variants
  SELECT json_build_object(
    'id', p.id,
    'slug', p.slug,
    'variants', json_agg(v)
  ) INTO result
  FROM products p
  LEFT JOIN variants v ON v.product_id = p.id
  WHERE p.id = new_product_id
  GROUP BY p.id;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

---

### Transaction Pattern 2: Safe Product Deletion

**Flow:**
```
BEGIN TRANSACTION
  1. Check if product has pending orders
     - YES → ROLLBACK with error "Cannot delete product with pending orders"
  2. Check if product has completed orders
     - YES → Soft-delete only (preserve history)
     - NO → Hard-delete allowed (admin decision)
  3. Disable all variants (set enabled = false)
  4. Mark product as deleted (set deleted_at = now())
  5. COMMIT
END TRANSACTION
```

**Pseudocode:**
```typescript
export async function adminDeleteProduct(productId: string) {
  await requireAdmin()
  
  // Transaction via RPC
  const { data, error } = await supabaseAdmin.rpc(
    'safe_delete_product',
    { product_id: productId }
  )
  
  if (error) {
    // Error will include reason (pending orders, etc.)
    throw new Error(error.message)
  }
  
  return data
}
```

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION safe_delete_product(product_id uuid)
RETURNS json AS $$
DECLARE
  pending_order_count int;
  variant_ids uuid[];
BEGIN
  -- Check for pending orders
  SELECT COUNT(*) INTO pending_order_count
  FROM order_items oi
  JOIN variants v ON v.id = oi.variant_id
  JOIN orders o ON o.id = oi.order_id
  WHERE v.product_id = product_id
    AND o.status IN ('PAYMENT_PENDING', 'PAID', 'FULFILLMENT_PENDING', 'SHIPPED');
  
  IF pending_order_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete product: % pending orders exist', pending_order_count;
  END IF;
  
  -- Disable all variants
  UPDATE variants
  SET enabled = false
  WHERE product_id = product_id
  RETURNING array_agg(id) INTO variant_ids;
  
  -- Soft-delete product (add deleted_at column)
  UPDATE products
  SET 
    published = false,
    updated_at = now()
    -- deleted_at = now()  -- Add this column in future
  WHERE id = product_id;
  
  RETURN json_build_object(
    'success', true,
    'disabled_variants', array_length(variant_ids, 1)
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Delete failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

---

### Transaction Pattern 3: Bulk Stock Update

**Flow:**
```
BEGIN TRANSACTION
  1. Validate all variant IDs exist
  2. Validate all stock quantities >= 0
  3. Update all variants in one query
  4. Log stock movements (audit trail)
  5. COMMIT
END TRANSACTION
```

**Pseudocode:**
```typescript
export async function adminBulkUpdateStock(
  updates: Array<{ variant_id: string; stock_quantity: number }>
) {
  await requireAdmin()
  
  // Pre-validation
  if (updates.length === 0) {
    throw new Error('No updates provided')
  }
  
  if (updates.some(u => u.stock_quantity < 0)) {
    throw new Error('Stock quantity cannot be negative')
  }
  
  // Transaction
  const { data, error } = await supabaseAdmin.rpc(
    'bulk_update_stock',
    { updates_json: JSON.stringify(updates) }
  )
  
  if (error) {
    throw new Error(`Bulk update failed: ${error.message}`)
  }
  
  return { success: true, updated: data.count }
}
```

**Database Function:**
```sql
CREATE OR REPLACE FUNCTION bulk_update_stock(updates_json jsonb)
RETURNS json AS $$
DECLARE
  update_count int;
BEGIN
  -- Validate all variants exist
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(updates_json) AS u
    WHERE NOT EXISTS (
      SELECT 1 FROM variants WHERE id = (u->>'variant_id')::uuid
    )
  ) THEN
    RAISE EXCEPTION 'One or more variant IDs not found';
  END IF;
  
  -- Update all variants
  WITH updates AS (
    SELECT 
      (value->>'variant_id')::uuid AS variant_id,
      (value->>'stock_quantity')::int AS new_stock
    FROM jsonb_array_elements(updates_json)
  )
  UPDATE variants v
  SET 
    stock_quantity = u.new_stock,
    updated_at = now()
  FROM updates u
  WHERE v.id = u.variant_id;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  RETURN json_build_object('count', update_count);
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Bulk update failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. VALIDATION RULES

### Product Validation

**On Create:**
```typescript
function validateProductData(data: ProductInput) {
  // Required fields
  if (!data.slug) throw new Error('Slug is required')
  if (!data.name) throw new Error('Name is required')
  if (!data.base_price) throw new Error('Base price is required')
  
  // Format validation
  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    throw new Error('Slug must be lowercase alphanumeric with hyphens')
  }
  
  if (data.slug.length > 100) {
    throw new Error('Slug too long (max 100 chars)')
  }
  
  // Price validation
  if (data.base_price <= 0) {
    throw new Error('Base price must be positive')
  }
  
  if (data.base_price > 100000000) {
    throw new Error('Base price too high (max ₹1,000,000)')
  }
  
  // Variants validation
  if (!data.variants || data.variants.length === 0) {
    throw new Error('At least one variant is required')
  }
  
  // Validate each variant
  data.variants.forEach((v, idx) => {
    if (!v.sku) throw new Error(`Variant ${idx}: SKU required`)
    if (!v.size) throw new Error(`Variant ${idx}: Size required`)
    if (!v.color) throw new Error(`Variant ${idx}: Color required`)
    if (v.stock_quantity < 0) {
      throw new Error(`Variant ${idx}: Stock cannot be negative`)
    }
  })
  
  // Check for duplicate SKUs
  const skus = data.variants.map(v => v.sku)
  const uniqueSkus = new Set(skus)
  if (skus.length !== uniqueSkus.size) {
    throw new Error('Duplicate SKUs in variants')
  }
  
  // Check for duplicate size+color combos
  const combos = data.variants.map(v => `${v.size}-${v.color}`)
  const uniqueCombos = new Set(combos)
  if (combos.length !== uniqueCombos.size) {
    throw new Error('Duplicate size+color combinations')
  }
}
```

**On Update:**
```typescript
function validateProductUpdate(updates: Partial<ProductInput>) {
  if (updates.slug && !/^[a-z0-9-]+$/.test(updates.slug)) {
    throw new Error('Slug must be lowercase alphanumeric with hyphens')
  }
  
  if (updates.base_price && updates.base_price <= 0) {
    throw new Error('Base price must be positive')
  }
  
  if (updates.name && updates.name.trim().length === 0) {
    throw new Error('Name cannot be empty')
  }
}
```

---

### Variant Validation

**On Create:**
```typescript
function validateVariantData(data: VariantInput) {
  if (!data.product_id) throw new Error('Product ID required')
  if (!data.sku) throw new Error('SKU required')
  if (!data.size) throw new Error('Size required')
  if (!data.color) throw new Error('Color required')
  
  // SKU format (alphanumeric with hyphens)
  if (!/^[A-Z0-9-]+$/.test(data.sku)) {
    throw new Error('SKU must be uppercase alphanumeric with hyphens')
  }
  
  // Stock validation
  if (data.stock_quantity < 0) {
    throw new Error('Stock quantity cannot be negative')
  }
  
  if (data.stock_quantity > 100000) {
    throw new Error('Stock quantity too high (max 100,000)')
  }
  
  // Price override validation
  if (data.price_override !== undefined && data.price_override !== null) {
    if (data.price_override <= 0) {
      throw new Error('Price override must be positive')
    }
  }
  
  // Low stock threshold
  if (data.low_stock_threshold && data.low_stock_threshold < 0) {
    throw new Error('Low stock threshold cannot be negative')
  }
}
```

**On Stock Update:**
```typescript
function validateStockUpdate(quantity: number) {
  if (typeof quantity !== 'number') {
    throw new Error('Stock quantity must be a number')
  }
  
  if (!Number.isInteger(quantity)) {
    throw new Error('Stock quantity must be an integer')
  }
  
  if (quantity < 0) {
    throw new Error('Stock quantity cannot be negative')
  }
  
  if (quantity > 100000) {
    throw new Error('Stock quantity too high (max 100,000)')
  }
}
```

---

### Database-Level Validation

**Constraints:**
```sql
-- Enforce at database level for safety

-- Positive prices
ALTER TABLE products
ADD CONSTRAINT products_base_price_positive 
CHECK (base_price > 0);

ALTER TABLE variants
ADD CONSTRAINT variants_price_override_positive
CHECK (price_override IS NULL OR price_override > 0);

-- Non-negative stock
ALTER TABLE variants
ADD CONSTRAINT variants_stock_non_negative
CHECK (stock_quantity >= 0);

-- SKU format (uppercase alphanumeric + hyphens)
ALTER TABLE variants
ADD CONSTRAINT variants_sku_format
CHECK (sku ~ '^[A-Z0-9-]+$');

-- Slug format (lowercase alphanumeric + hyphens)
ALTER TABLE products
ADD CONSTRAINT products_slug_format
CHECK (slug ~ '^[a-z0-9-]+$');
```

---

## 5. SAFETY RULES

### Rule 1: Never Hard-Delete Products with Orders

**Problem:** Deleting product breaks foreign key relationships in order_items

**Solution:** 
- Soft-delete by default (set `enabled = false`)
- Only allow hard-delete if NO orders ever referenced this product
- Admin must explicitly confirm hard-delete

**Implementation:**
```typescript
export async function adminDeleteProduct(
  productId: string,
  hardDelete: boolean = false
) {
  await requireAdmin()
  
  // Check order history
  const { data: orderCount } = await supabaseAdmin
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .in('variant_id', 
      supabaseAdmin
        .from('variants')
        .select('id')
        .eq('product_id', productId)
    )
  
  if (orderCount > 0) {
    if (hardDelete) {
      throw new Error(
        `Cannot hard-delete: Product has ${orderCount} order items in history`
      )
    }
    
    // Soft-delete only
    return await softDeleteProduct(productId)
  }
  
  // No orders, allow hard-delete if requested
  if (hardDelete) {
    return await hardDeleteProduct(productId)
  } else {
    return await softDeleteProduct(productId)
  }
}

async function softDeleteProduct(productId: string) {
  // Disable product and all variants
  await supabaseAdmin.from('products').update({ 
    published: false 
  }).eq('id', productId)
  
  await supabaseAdmin.from('variants').update({ 
    enabled: false 
  }).eq('product_id', productId)
  
  return { success: true, type: 'soft_delete' }
}

async function hardDeleteProduct(productId: string) {
  // Cascade delete (variants deleted automatically)
  await supabaseAdmin.from('products').delete().eq('id', productId)
  
  return { success: true, type: 'hard_delete' }
}
```

---

### Rule 2: Prevent Negative Stock

**Problem:** Stock goes negative due to race conditions or bugs

**Solution:**
- Database constraint (CHECK stock_quantity >= 0)
- Application-level validation
- Use RETURNING to verify update

**Implementation:**
```typescript
export async function adminUpdateVariantStock(
  variantId: string,
  quantity: number
) {
  await requireAdmin()
  
  if (quantity < 0) {
    throw new Error('Stock quantity cannot be negative')
  }
  
  const { data, error } = await supabaseAdmin
    .from('variants')
    .update({ stock_quantity: quantity })
    .eq('id', variantId)
    .select()
    .single()
  
  if (error) {
    // Database constraint violation
    if (error.code === '23514') {
      throw new Error('Stock quantity cannot be negative')
    }
    throw new Error(`Update failed: ${error.message}`)
  }
  
  return data
}
```

---

### Rule 3: Preserve Last Variant

**Problem:** Admin disables all variants, product becomes unbuyable

**Solution:** Prevent disabling last enabled variant

**Implementation:**
```typescript
export async function adminDisableVariant(variantId: string) {
  await requireAdmin()
  
  // Get variant's product ID
  const { data: variant } = await supabaseAdmin
    .from('variants')
    .select('product_id')
    .eq('id', variantId)
    .single()
  
  // Count enabled variants for this product
  const { count } = await supabaseAdmin
    .from('variants')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', variant.product_id)
    .eq('enabled', true)
  
  if (count <= 1) {
    throw new Error(
      'Cannot disable last variant. Product must have at least one enabled variant.'
    )
  }
  
  // Safe to disable
  await supabaseAdmin
    .from('variants')
    .update({ enabled: false })
    .eq('id', variantId)
  
  return { success: true }
}
```

---

### Rule 4: Unique Constraints

**Problem:** Duplicate slugs, SKUs, or size+color combos

**Solution:** Database unique constraints + pre-validation

**Implementation:**
```typescript
export async function adminCreateProduct(data: ProductInput) {
  await requireAdmin()
  
  // Check slug uniqueness
  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('slug', data.slug)
    .single()
  
  if (existing) {
    throw new Error(`Slug "${data.slug}" already exists`)
  }
  
  // Check variant SKU uniqueness
  for (const variant of data.variants) {
    const { data: existingSku } = await supabaseAdmin
      .from('variants')
      .select('id')
      .eq('sku', variant.sku)
      .single()
    
    if (existingSku) {
      throw new Error(`SKU "${variant.sku}" already exists`)
    }
  }
  
  // Proceed with creation...
}
```

---

## 6. ERROR HANDLING STRATEGY

### Error Types

**1. Validation Errors (400)**
- Invalid input format
- Missing required fields
- Business rule violations

**2. Not Found Errors (404)**
- Product/variant doesn't exist
- Referenced entity missing

**3. Conflict Errors (409)**
- Duplicate slug/SKU
- Constraint violations

**4. Authorization Errors (403)**
- User is not admin
- Operation not allowed (e.g., delete product with orders)

**5. Database Errors (500)**
- Connection failures
- Transaction rollbacks
- Constraint violations

---

### Error Response Format

```typescript
type AdminActionResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: any } }

// Example usage
export async function adminCreateProduct(
  data: ProductInput
): Promise<AdminActionResult<Product>> {
  try {
    await requireAdmin()
    
    // Validation
    validateProductData(data)
    await checkSlugUnique(data.slug)
    
    // Creation logic...
    const product = await createProductWithVariants(data)
    
    return { success: true, data: product }
    
  } catch (error) {
    if (error.message.includes('unique constraint')) {
      return {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Slug or SKU already exists',
          details: error.message
        }
      }
    }
    
    if (error.message.includes('Unauthorized')) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required'
        }
      }
    }
    
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    }
  }
}
```

---

### Rollback Strategy

**Automatic Rollback:**
- Database transactions rollback on exception
- Use RPC functions for multi-step operations

**Manual Compensation:**
- For operations spanning multiple services (e.g., image upload + DB)
- Delete uploaded images if DB insert fails

**Example:**
```typescript
export async function adminCreateProduct(data: ProductInput) {
  await requireAdmin()
  
  let uploadedImages: string[] = []
  
  try {
    // Step 1: Upload images to storage
    if (data.images) {
      uploadedImages = await uploadProductImages(data.images)
      data.images = uploadedImages.map(url => ({ url, alt: data.name }))
    }
    
    // Step 2: Create product in database (transaction)
    const product = await supabaseAdmin.rpc('create_product_with_variants', {
      product_data: data,
      variants_data: data.variants
    })
    
    return { success: true, data: product }
    
  } catch (error) {
    // Compensation: Delete uploaded images
    if (uploadedImages.length > 0) {
      await deleteProductImages(uploadedImages)
    }
    
    throw error
  }
}
```

---

## 7. COMPLEX FLOW EXAMPLES

### Example 1: Create Product with Variants

**Full Flow:**
```typescript
export async function adminCreateProduct(input: {
  // Product fields
  slug: string
  name: string
  description: string
  base_price: number
  category: string
  tags: string[]
  images: Array<{ url: string; alt: string }>
  
  // Variants
  variants: Array<{
    sku: string
    size: string
    color: string
    stock_quantity: number
    price_override?: number
  }>
}) {
  // === STEP 1: AUTH GUARD ===
  await requireAdmin()
  
  // === STEP 2: INPUT VALIDATION ===
  validateProductData(input)
  
  // === STEP 3: UNIQUENESS CHECKS ===
  const slugExists = await checkSlugExists(input.slug)
  if (slugExists) {
    throw new Error(`Slug "${input.slug}" already taken`)
  }
  
  const duplicateSkus = await checkSkusExist(input.variants.map(v => v.sku))
  if (duplicateSkus.length > 0) {
    throw new Error(`SKUs already exist: ${duplicateSkus.join(', ')}`)
  }
  
  // === STEP 4: DATABASE TRANSACTION ===
  const { data: product, error } = await supabaseAdmin.rpc(
    'create_product_with_variants',
    {
      product_data: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        base_price: input.base_price,
        category: input.category,
        tags: input.tags,
        images: input.images,
        published: false  // Draft by default
      },
      variants_data: input.variants
    }
  )
  
  if (error) {
    throw new Error(`Product creation failed: ${error.message}`)
  }
  
  // === STEP 5: AUDIT LOG (optional) ===
  await logAdminAction({
    action: 'product_created',
    product_id: product.id,
    details: `Created "${product.name}" with ${input.variants.length} variants`
  })
  
  return product
}
```

---

### Example 2: Bulk Stock Import from CSV

**Flow:**
```typescript
export async function adminImportStockCSV(csvData: string) {
  await requireAdmin()
  
  // === STEP 1: PARSE CSV ===
  const rows = parseCSV(csvData)  // Returns: [{ sku, stock }]
  
  if (rows.length === 0) {
    throw new Error('CSV is empty')
  }
  
  // === STEP 2: VALIDATE ALL ROWS ===
  const errors: string[] = []
  const updates: Array<{ variant_id: string; stock_quantity: number }> = []
  
  for (const [index, row] of rows.entries()) {
    // Validate SKU format
    if (!row.sku || !/^[A-Z0-9-]+$/.test(row.sku)) {
      errors.push(`Row ${index + 1}: Invalid SKU format`)
      continue
    }
    
    // Validate stock quantity
    const stock = parseInt(row.stock)
    if (isNaN(stock) || stock < 0) {
      errors.push(`Row ${index + 1}: Invalid stock quantity`)
      continue
    }
    
    // Find variant by SKU
    const { data: variant } = await supabaseAdmin
      .from('variants')
      .select('id')
      .eq('sku', row.sku)
      .single()
    
    if (!variant) {
      errors.push(`Row ${index + 1}: SKU "${row.sku}" not found`)
      continue
    }
    
    updates.push({
      variant_id: variant.id,
      stock_quantity: stock
    })
  }
  
  // === STEP 3: CHECK FOR ERRORS ===
  if (errors.length > 0) {
    throw new Error(`CSV validation failed:\n${errors.join('\n')}`)
  }
  
  // === STEP 4: BULK UPDATE IN TRANSACTION ===
  const { data, error } = await supabaseAdmin.rpc(
    'bulk_update_stock',
    { updates_json: JSON.stringify(updates) }
  )
  
  if (error) {
    throw new Error(`Bulk import failed: ${error.message}`)
  }
  
  // === STEP 5: LOG SUCCESS ===
  await logAdminAction({
    action: 'stock_imported',
    details: `Updated ${updates.length} variants from CSV`
  })
  
  return {
    success: true,
    updated: updates.length,
    skipped: rows.length - updates.length
  }
}
```

---

### Example 3: Safe Product Deletion

**Flow:**
```typescript
export async function adminDeleteProduct(
  productId: string,
  options?: { hardDelete?: boolean; skipOrderCheck?: boolean }
) {
  await requireAdmin()
  
  // === STEP 1: VERIFY PRODUCT EXISTS ===
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id, name')
    .eq('id', productId)
    .single()
  
  if (!product) {
    throw new Error('Product not found')
  }
  
  // === STEP 2: CHECK ORDER HISTORY ===
  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select(`
      id,
      variants!inner (
        product_id
      )
    `)
    .eq('variants.product_id', productId)
  
  const hasOrders = orderItems && orderItems.length > 0
  
  if (hasOrders) {
    // Check for pending orders
    const { data: pendingOrders } = await supabaseAdmin
      .from('order_items')
      .select(`
        id,
        orders!inner (
          id,
          status
        ),
        variants!inner (
          product_id
        )
      `)
      .eq('variants.product_id', productId)
      .in('orders.status', ['PAYMENT_PENDING', 'PAID', 'FULFILLMENT_PENDING', 'SHIPPED'])
    
    if (pendingOrders && pendingOrders.length > 0) {
      throw new Error(
        `Cannot delete: Product has ${pendingOrders.length} pending orders. ` +
        `Wait for orders to complete or cancel them first.`
      )
    }
    
    // Product has completed orders only
    if (options?.hardDelete) {
      throw new Error(
        `Cannot hard-delete: Product has ${orderItems.length} order items in history. ` +
        `Use soft-delete to preserve order history.`
      )
    }
  }
  
  // === STEP 3: EXECUTE DELETION ===
  if (options?.hardDelete && !hasOrders) {
    // Hard delete (cascade to variants)
    await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId)
    
    return {
      success: true,
      type: 'hard_delete',
      message: `Product "${product.name}" permanently deleted`
    }
  } else {
    // Soft delete
    await supabaseAdmin
      .from('products')
      .update({ published: false })
      .eq('id', productId)
    
    await supabaseAdmin
      .from('variants')
      .update({ enabled: false })
      .eq('product_id', productId)
    
    return {
      success: true,
      type: 'soft_delete',
      message: `Product "${product.name}" disabled (soft-deleted)`
    }
  }
}
```

---

## 8. ADMIN ACTION CHECKLIST

Before implementing each admin action, verify:

**Security:**
- [ ] `requireAdmin()` called at start
- [ ] No client-side access (server-only)
- [ ] Uses `supabaseAdmin` client

**Validation:**
- [ ] Input validation (types, formats, ranges)
- [ ] Uniqueness checks (slug, SKU)
- [ ] Business rules enforced

**Transactions:**
- [ ] Multi-step operations use transactions
- [ ] Error handling includes rollback
- [ ] Compensation logic for external operations

**Safety:**
- [ ] Check order history before deletion
- [ ] Prevent negative stock
- [ ] Preserve last variant
- [ ] Soft-delete by default

**Error Handling:**
- [ ] Clear error messages
- [ ] Appropriate error codes
- [ ] Rollback on failure
- [ ] Logging for debugging

**Performance:**
- [ ] Pagination for list operations
- [ ] Indexes on query fields
- [ ] Bulk operations use batch updates

---

## SUMMARY

### Admin Actions Defined

**Product Management:**
- Create product with variants (transaction)
- Update product details
- Publish/unpublish
- Soft/hard delete (with safety checks)
- List/search products

**Variant Management:**
- Create/update/delete variants
- Stock updates (single and bulk)
- Enable/disable variants
- Price overrides

**Bulk Operations:**
- Bulk publish
- Bulk price updates
- CSV stock import

### Safety Rules

1. ✅ Soft-delete products with order history
2. ✅ Prevent negative stock (DB constraint + validation)
3. ✅ Preserve last variant (prevent orphaned products)
4. ✅ Enforce unique constraints (slug, SKU, size+color)
5. ✅ Check pending orders before deletion

### Transaction Strategy

- ✅ Use transactions for multi-step operations
- ✅ RPC functions for complex flows
- ✅ Automatic rollback on database errors
- ✅ Manual compensation for external operations (image uploads)

### Error Handling

- ✅ Typed error responses
- ✅ Clear error messages
- ✅ Appropriate HTTP codes
- ✅ Audit logging

**Implementation-ready design. Next steps: Build RPC functions and server actions. ✅**
