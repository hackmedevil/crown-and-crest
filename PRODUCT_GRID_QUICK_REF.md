# Product Grid System - Quick Reference

## 🚀 Basic Import

```tsx
import { ProductGrid } from '@/components/product'
import { useProducts } from '@/hooks/useProducts'
```

## 📝 Minimal Example

```tsx
export default function Page() {
  const { products, loading, hasMore, loadMore } = useProducts()

  return (
    <ProductGrid
      products={products}
      loading={loading}
      onLoadMore={loadMore}
      hasMore={hasMore}
    />
  )
}
```

## 🎨 Full Example

```tsx
export default function Page() {
  const { products, loading, hasMore, loadMore } = useProducts()

  return (
    <ProductGrid
      products={products}
      loading={loading}
      onLoadMore={loadMore}
      hasMore={hasMore}
      onWishlistToggle={(id, isWishlisted) => {
        // Handle wishlist
      }}
      onQuickAdd={(id, size) => {
        // Handle quick add
      }}
      prefetchOnHover={true}
      columns={{
        mobile: 2,
        tablet: 3,
        desktop: 4
      }}
    />
  )
}
```

## 🔧 Props

### ProductGrid

| Prop | Type | Default |
|------|------|---------|
| `products` | `GridProduct[]` | Required |
| `loading` | `boolean` | `false` |
| `onLoadMore` | `() => void` | - |
| `hasMore` | `boolean` | `false` |
| `onWishlistToggle` | `(id, state) => void` | - |
| `onQuickAdd` | `(id, size) => void` | - |
| `prefetchOnHover` | `boolean` | `true` |
| `columns` | `object` | `{mobile:2, tablet:3, desktop:4}` |

### useProducts

| Option | Type | Default |
|--------|------|---------|
| `endpoint` | `string` | `/api/products` |
| `pageSize` | `number` | `12` |
| `initialCursor` | `string` | `new Date().toISOString()` |
| `autoFetch` | `boolean` | `true` |

**Returns:**
- `products` - Array of products
- `loading` - Loading state
- `hasMore` - More products available
- `loadMore` - Function to load more
- `refresh` - Function to refresh
- `error` - Error state

## 📊 API Format

```typescript
// GET /api/products?cursor=<timestamp>
{
  "products": [
    {
      "id": "prod_123",
      "name": "Product Name",
      "slug": "product-slug",
      "brand": "Brand Name",
      "base_price": 799,
      "mrp": 1299,
      "rating": 4.5,
      "review_count": 127,
      "is_new": false,
      "is_on_sale": true,
      "is_bestseller": false,
      "image_url": "https://...",
      "delivery_message": "Free Delivery"
    }
  ],
  "nextCursor": "2026-03-08T10:00:00.000Z"
}
```

## 🛠️ Utilities

```tsx
import {
  toGridProduct,
  calculateDiscount,
  sortProducts,
  filterByPriceRange
} from '@/lib/product-grid-utils'

// Transform Product to GridProduct
const gridProduct = toGridProduct(product, {
  brand: 'Crown & Crest',
  rating: 4.5,
  is_new: true
})

// Calculate discount
const discount = calculateDiscount(1299, 799) // 38%

// Sort products
const sorted = sortProducts(products, 'price-low')

// Filter by price
const filtered = filterByPriceRange(products, 500, 2000)
```

## 📱 Responsive Columns

```tsx
<ProductGrid
  columns={{
    mobile: 2,    // < 768px
    tablet: 3,    // 768px - 1024px
    desktop: 4    // > 1024px
  }}
/>
```

## 🎯 Common Patterns

### Category Page
```tsx
<ProductGrid products={products} onLoadMore={loadMore} hasMore={hasMore} />
```

### Featured Section
```tsx
<ProductGrid products={products.slice(0, 8)} loading={loading} />
```

### Search Results
```tsx
<ProductGrid products={searchResults} loading={searching} />
```

### With Filters
```tsx
const filtered = filterByPriceRange(sortProducts(products, 'price-low'), min, max)
<ProductGrid products={filtered} />
```

## 📂 Files

```
components/product/
├── ProductCard.tsx          # Main card
├── ProductGrid.tsx          # Grid layout
├── ProductCardSkeleton.tsx  # Loading state
├── index.ts                 # Exports

hooks/
├── useInfiniteScroll.ts    # Infinite scroll
├── useProducts.ts           # Product fetching

types/
└── grid.ts                  # Types

lib/
└── product-grid-utils.ts    # Utilities
```

## 🧪 Testing Checklist

- [ ] Grid displays products
- [ ] Images load correctly
- [ ] Infinite scroll loads more
- [ ] Cards are clickable
- [ ] Wishlist button works
- [ ] Quick add appears on hover
- [ ] Responsive on mobile
- [ ] Skeleton shows while loading
- [ ] Empty state displays
- [ ] End message shows

## 📚 Examples

See complete examples in:
- `src/components/product/ProductGridExamples.tsx`
- `src/components/product/ProductListingExample.tsx`

## 📖 Full Docs

See complete documentation:
- `src/components/product/PRODUCT_GRID_README.md`
- `PRODUCT_GRID_IMPLEMENTATION.md`
