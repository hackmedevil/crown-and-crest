# PDP Variant Selection Data Contract

This document defines the data shape, query patterns, and business rules for Product Detail Pages (PDP) with variant selection in a fashion e-commerce context.

## 1) PDP Data Shape (TypeScript)

```typescript
// Core variant data for PDP
export type PDPVariant = {
  id: string
  product_id: string
  sku: string
  size: string | null
  color: string | null
  price_override: number | null
  stock_quantity: number
  low_stock_threshold: number
  is_enabled: boolean
  position: number
  created_at: string
  
  // Joined variant media (is_active=true only)
  media?: VariantMedia[]
}

export type VariantMedia = {
  id: string
  variant_id: string
  cloudinary_public_id: string
  resource_type: 'image' | 'video'
  width: number | null
  height: number | null
  aspect_ratio: number | null
  alt_text: string | null
  position: number
  is_primary: boolean
}

export type ProductMedia = {
  id: string
  product_id: string
  cloudinary_public_id: string
  resource_type: 'image' | 'video'
  width: number | null
  height: number | null
  aspect_ratio: number | null
  alt_text: string | null
  position: number
  is_primary: boolean
}

// Full PDP data structure
export type PDPData = {
  product: {
    id: string
    name: string
    slug: string
    description: string | null
    base_price: number
    is_active: boolean
    created_at: string
  }
  
  // All active variants (enabled + stock >= 0)
  variants: PDPVariant[]
  
  // Product-level media (is_active=true only)
  productMedia: ProductMedia[]
  
  // Derived/computed client-side
  availableSizes: string[] // Unique sizes from enabled variants
  availableColors: string[] // Unique colors from enabled variants
}
```

## 2) Variant Grouping Logic

Fashion products typically have two attributes: **size** and **color**.

### Two-Way Filtering (Deterministic)
- **Colors available for a selected size**: When user picks a size, show only colors that have enabled variants with that size.
- **Sizes available for a selected color**: When user picks a color, show only sizes that have enabled variants with that color.
- **Ordering**: Sort alphabetically or by natural size order (XS, S, M, L, XL); colors alphabetically or by custom order (if stored in DB).

### Grouping Strategy (Client-Side)
```typescript
function getAvailableColorsForSize(variants: PDPVariant[], size: string): string[] {
  return Array.from(
    new Set(
      variants
        .filter(v => v.is_enabled && v.size === size && v.color)
        .map(v => v.color!)
    )
  ).sort() // Deterministic alphabetical order
}

function getAvailableSizesForColor(variants: PDPVariant[], color: string): string[] {
  const sizes = Array.from(
    new Set(
      variants
        .filter(v => v.is_enabled && v.color === color && v.size)
        .map(v => v.size!)
    )
  )
  
  // Optional: Apply natural size ordering (XS, S, M, L, XL, XXL)
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
  return sizes.sort((a, b) => {
    const aIdx = sizeOrder.indexOf(a)
    const bIdx = sizeOrder.indexOf(b)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    return a.localeCompare(b) // Fallback to alphabetical
  })
}

function getVariantByAttributes(
  variants: PDPVariant[],
  size: string | null,
  color: string | null
): PDPVariant | undefined {
  return variants.find(
    v => v.is_enabled && v.size === size && v.color === color
  )
}

// Compute all available options on page load
function computeAvailableOptions(variants: PDPVariant[]): {
  sizes: string[]
  colors: string[]
} {
  const sizes = Array.from(new Set(variants.filter(v => v.is_enabled && v.size).map(v => v.size!)))
  const colors = Array.from(new Set(variants.filter(v => v.is_enabled && v.color).map(v => v.color!)))
  
  return {
    sizes: sizes.sort(), // Apply natural ordering as above
    colors: colors.sort(),
  }
}
```

### Initial Selection
- On page load, no variant is selected by default.
- Display base product price and product media.
- User must select both size and color (or whichever attributes exist) to lock a variant.
- Show all available sizes and colors (from enabled variants).

### Selection Flow
1. User picks size → filter available colors → update color selector (disable unavailable colors)
2. User picks color → find exact variant → update price, stock, media
3. If either attribute changes, recompute available options and selected variant
4. Disabled/out-of-stock variants are not selectable (UI grays them out)

## 3) Price Logic

```typescript
function getDisplayPrice(
  basePrice: number,
  selectedVariant: PDPVariant | null
): number {
  return selectedVariant?.price_override ?? basePrice
}

function hasPriceChanged(
  basePrice: number,
  selectedVariant: PDPVariant | null
): boolean {
  if (!selectedVariant) return false
  return selectedVariant.price_override !== null && selectedVariant.price_override !== basePrice
}
```

- **No variant selected**: Display `product.base_price`
- **Variant selected**: Display `variant.price_override` if set, else `product.base_price`
- **Price change indicator**: If variant price differs from base, show visual indicator (e.g., "Was ₹X, Now ₹Y" or badge "Special Price")
- **Format**: ₹{price.toLocaleString('en-IN')}

### Example UI States
- No variant: "₹2,999"
- Variant with no override: "₹2,999" (no change)
- Variant with override (higher): "₹3,499" with badge "Premium Size"
- Variant with override (lower): "₹2,499" with badge "Sale Price" or strikethrough base price

## 4) Stock Display Rules (Display-Only)

```typescript
type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

function getStockStatus(variant: PDPVariant): StockStatus {
  if (variant.stock_quantity === 0) return 'out_of_stock'
  if (variant.stock_quantity >= 1 && variant.stock_quantity <= 10) return 'low_stock'
  return 'in_stock' // stock_quantity > 10
}

function getStockDisplayText(status: StockStatus, quantity: number): string {
  switch (status) {
    case 'out_of_stock':
      return 'Out of Stock'
    case 'low_stock':
      return `Only ${quantity} left in stock`
    case 'in_stock':
      return 'In Stock'
  }
}
```

### Display Rules
- **No variant selected**: Do not show stock status (product-level stock doesn't exist)
- **Variant selected + Out of stock (0)**: Show "Out of Stock" badge; disable "Add to Cart" button
- **Variant selected + Low stock (1–10)**: Show "Only X left" badge in orange/yellow
- **Variant selected + In stock (>10)**: Show "In Stock" badge in green
- **Variant disabled**: Not selectable in UI; grayed out in variant picker

### Important
- This is **display-only**; no reservation logic.
- Stock values are **informational** and may change between page load and checkout.
- When checkout is wired, `reserveStock` will be called at order creation (see ADMIN_INVENTORY_CONCURRENCY.md).
- Do NOT attempt to reserve stock on variant selection or "Add to Cart" yet.

## 5) Media Switching Rules

```typescript
function getMediaForSelectedVariant(
  productMedia: ProductMedia[],
  selectedVariant: PDPVariant | null
): (ProductMedia | VariantMedia)[] {
  // If variant selected, enabled, and has active media, use variant media
  if (
    selectedVariant &&
    selectedVariant.is_enabled &&
    selectedVariant.media &&
    selectedVariant.media.length > 0
  ) {
    return selectedVariant.media
  }
  
  // Otherwise use product media
  return productMedia
}
```

### Switching Behavior
1. **No variant selected**: Show product media
2. **Variant selected + has variant media**: Show variant media (primary first, then by position)
3. **Variant selected + no variant media**: Show product media (fallback)
4. **Variant becomes disabled/out of stock**: Still show its media if selected; disable purchase only

### Gallery Update
- When user switches variants, update `<ProductGallery>` props with new media array
- Gallery will re-render with new images; reset to primary (index 0)

## 6) Example Queries

### 6a) Supabase Query (Single Fetch, Recommended)

**Read-only, optimized for cache/ISR:**

```typescript
import { supabaseServer } from '@/lib/supabase/server'

export async function fetchPDPData(slug: string): Promise<PDPData | null> {
  const supabase = await supabaseServer()
  
  // Single query with nested joins; filters at each level for efficiency
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      base_price,
      is_active,
      created_at,
      productMedia:product_media(
        id,
        cloudinary_public_id,
        resource_type,
        width,
        height,
        aspect_ratio,
        alt_text,
        position,
        is_primary
      ),
      variants(
        id,
        product_id,
        sku,
        size,
        color,
        price_override,
        stock_quantity,
        low_stock_threshold,
        is_enabled,
        position,
        created_at,
        media:variant_media(
          id,
          variant_id,
          cloudinary_public_id,
          resource_type,
          width,
          height,
          aspect_ratio,
          alt_text,
          position,
          is_primary
        )
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    // Filter product media: is_active only
    .eq('productMedia.is_active', true)
    // Filter variants: enabled only
    .eq('variants.is_enabled', true)
    // Filter variant media: is_active only
    .eq('variants.media.is_active', true)
    .order('productMedia.is_primary', { ascending: false })
    .order('productMedia.position', { ascending: true })
    .order('variants.position', { ascending: true })
    .order('variants.media.is_primary', { foreignTable: 'variants.media', ascending: false })
    .order('variants.media.position', { foreignTable: 'variants.media', ascending: true })
    .single()
  
  if (error || !product) return null
  
  // Cast and return structured data
  return {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      base_price: product.base_price,
      is_active: product.is_active,
      created_at: product.created_at,
    },
    variants: (product.variants || []) as PDPVariant[],
    productMedia: (product.productMedia || []) as ProductMedia[],
    availableSizes: [], // Computed client-side
    availableColors: [], // Computed client-side
  }
}
```

### 6b) SQL Query (Read-Only, For Reference)

```sql
-- Fetch product
SELECT
  p.id, p.name, p.slug, p.description, p.base_price, p.is_active, p.created_at
FROM products p
WHERE p.slug = :slug AND p.is_active = true;

-- Fetch product media (is_active only)
SELECT
  pm.id, pm.product_id, pm.cloudinary_public_id, pm.resource_type,
  pm.width, pm.height, pm.aspect_ratio, pm.alt_text, pm.position, pm.is_primary
FROM product_media pm
WHERE pm.product_id = :product_id AND pm.is_active = true
ORDER BY pm.is_primary DESC, pm.position ASC;

-- Fetch variants with media (enabled only)
SELECT
  v.id, v.product_id, v.sku, v.size, v.color, v.price_override,
  v.stock_quantity, v.low_stock_threshold, v.is_enabled, v.position, v.created_at,
  vm.id AS media_id, vm.cloudinary_public_id, vm.resource_type,
  vm.width, vm.height, vm.aspect_ratio, vm.alt_text,
  vm.position AS media_position, vm.is_primary AS media_is_primary
FROM variants v
LEFT JOIN variant_media vm ON vm.variant_id = v.id AND vm.is_active = true
WHERE v.product_id = :product_id AND v.is_enabled = true
ORDER BY v.position ASC, vm.is_primary DESC, vm.position ASC;
```

### Query Efficiency Notes
- **Single Supabase query** preferred: Uses nested selects with filters; fewer round-trips; avoids N+1 queries.
- **Cache-friendly**: Product/variants/media rarely change; response can be cached at CDN/ISR layer (Next.js `revalidate: 3600`).
- **Filters at each level**: `is_active=true` for media, `is_enabled=true` for variants → reduces payload size.
- **Order by**: Deterministic ordering (primary first, then position) ensures consistent UI rendering.
- **Indexes required**: 
  - `products(slug)` for fast product lookup
  - `product_media(product_id, is_active, is_primary, position)` for media filtering
  - `variants(product_id, is_enabled, position)` for variant filtering
  - `variant_media(variant_id, is_active, is_primary, position)` for variant media filtering
- **No client-side joins**: All relationships resolved server-side; client receives structured tree.

## 7) Usage Flow Summary

1. **Fetch**: Call `fetchPDPData(slug)` on server (or via API route)
2. **Render**: Pass `PDPData` to PDP component
3. **Client State**:
   - `selectedSize: string | null`
   - `selectedColor: string | null`
   - `selectedVariant: PDPVariant | null` (derived from size + color)
4. **On Attribute Change**:
   - Update available options for other attribute
   - Find matching variant
   - Update price, stock, and media
5. **Add to Cart**:
   - Require `selectedVariant` to be non-null and enabled
   - Pass `variant_id` to cart action
   - (Future) Call `reserveStock(variantId, quantity)` before adding to cart

## 8) Edge Cases

- **Product has no variants**: Show product-only (no variant selector); use base price and product media.
- **Variant has no media**: Fallback to product media (as per media switching rules).
- **Variant disabled mid-session**: User can still view; "Add to Cart" disabled with "Out of Stock" message.
- **Price override null**: Display base price (transparent to user).
- **Size or color null**: Variant grouping skips nulls; if product uses only size (no color), color filter is omitted.

## 9) Future Enhancements

- **Inventory Reservations**: When checkout is wired, call `reserveStock` on "Add to Cart" (see ADMIN_INVENTORY_CONCURRENCY.md).
- **Real-time Stock**: Use Supabase realtime subscriptions to update stock display if inventory changes.
- **Variant Recommendations**: "Similar colors" or "Other sizes" based on user preferences.
- **Preload Variant Media**: Prefetch media for adjacent variants on hover for faster switching.

---

This contract is ready for PDP UI implementation. Adjust attribute names (size, color) if your schema uses different terms (e.g., "dimension", "finish").
