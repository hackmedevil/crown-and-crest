# Navigation System - Quick Start Guide

**Fast integration guide for Crown and Crest**

---

## 🎯 Implementation Checklist

### ✅ Files Created

All navigation components are in `src/components/navigation/`:

- ✅ `Navbar.tsx` - Main navigation wrapper
- ✅ `AnnouncementBar.tsx` - Top announcement bar
- ✅ `SearchBar.tsx` - Search with autocomplete
- ✅ `AccountDropdown.tsx` - Account menu
- ✅ `CartIcon.tsx` - Cart & wishlist icons
- ✅ `NavbarCategories.tsx` - Category bar
- ✅ `MegaMenu.tsx` - Category mega menu
- ✅ `MobileDrawer.tsx` - Mobile navigation
- ✅ `index.ts` - Export barrel

### ✅ Styles Added

- ✅ Navigation animations added to `src/app/globals.css`

---

## 🚀 Integration Steps

### Step 1: Create Navbar Wrapper Component

Create `src/components/NavbarWrapper.tsx`:

```tsx
'use client'

import { Navbar } from '@/components/navigation'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'

export default function NavbarWrapper({ 
  categories, 
  storeName, 
  logoUrl 
}: { 
  categories: any[]
  storeName?: string
  logoUrl?: string | null
}) {
  const { user, openLoginModal, logout } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const [wishlistCount, setWishlistCount] = useState(0)

  // Load cart count from localStorage
  useEffect(() => {
    const updateCounts = () => {
      try {
        const cart = localStorage.getItem('cart')
        if (cart) {
          const items = JSON.parse(cart)
          setCartCount(items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0))
        }
        
        const wishlist = localStorage.getItem('wishlist')
        if (wishlist) {
          setWishlistCount(JSON.parse(wishlist).length)
        }
      } catch (error) {
        console.error('Error loading cart/wishlist:', error)
      }
    }

    updateCounts()

    // Listen for cart updates
    window.addEventListener('storage', updateCounts)
    window.addEventListener('cartUpdated', updateCounts)
    
    return () => {
      window.removeEventListener('storage', updateCounts)
      window.removeEventListener('cartUpdated', updateCounts)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <Navbar
      isLoggedIn={!!user}
      firstName={user?.first_name}
      cartCount={cartCount}
      wishlistCount={wishlistCount}
      categories={categories}
      storeName={storeName}
      logoUrl={logoUrl}
      onLoginClick={openLoginModal}
      onLogout={handleLogout}
    />
  )
}
```

### Step 2: Update Layout to Fetch Categories

Update `src/app/layout.tsx`:

```tsx
import NavbarWrapper from '@/components/NavbarWrapper'
import { createClient } from '@/lib/supabase/server'

export default async function RootLayout({ children }) {
  // Fetch categories server-side
  const supabase = createClient()
  
  const { data: categories } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      image_url,
      description,
      subcategories:categories!parent_id(
        id,
        name,
        slug,
        description
      )
    `)
    .is('parent_id', null)
    .eq('is_active', true)
    .order('position')

  // Fetch store settings
  const { data: storeSettings } = await supabase
    .from('store_settings')
    .select('store_name, logo_url')
    .single()

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavbarWrapper 
            categories={categories || []}
            storeName={storeSettings?.store_name}
            logoUrl={storeSettings?.logo_url}
          />
          {children}
          <LoginModal />
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Step 3: Remove Old Navigation Components

Remove or comment out old navigation:

```tsx
// ❌ Remove these from layout.tsx
// import AnnouncementBar from '@/components/AnnouncementBar'
// import HeaderClient from '@/components/Header.client'
// import HeaderServer from '@/components/Header.server'

// <AnnouncementBar />
// <HeaderClient ... />
```

### Step 4: Test Search API Compatibility

Verify your search API returns the expected format:

```typescript
// Expected response from /api/search?q=...
{
  success: true,
  results: [
    {
      id: "prod-1",
      name: "Product Name",
      slug: "product-slug",
      basePrice: 2999, // Price in paise
      imageUrl: "https://..."
    }
  ],
  total: 42
}
```

If your API format is different, update `SearchBar.tsx`:

```tsx
// Line ~85 in SearchBar.tsx
const productsData = await productsRes.json()

// Adapt to your format
setResults({
  products: productsData.results.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    basePrice: p.base_price, // Adjust field name if needed
    imageUrl: p.image_url     // Adjust field name if needed
  })),
  categories: categoriesData.categories || []
})
```

### Step 5: Add Cart Update Event

When items are added/removed from cart, dispatch event:

```tsx
// After updating cart in localStorage
localStorage.setItem('cart', JSON.stringify(updatedCart))

// Dispatch event to update navbar badge
window.dispatchEvent(new Event('cartUpdated'))
```

Example in your cart actions:

```tsx
export function addToCart(item: CartItem) {
  const cart = getCart()
  cart.push(item)
  localStorage.setItem('cart', JSON.stringify(cart))
  
  // Trigger navbar update
  window.dispatchEvent(new Event('cartUpdated'))
}

export function removeFromCart(variantId: string) {
  const cart = getCart().filter(item => item.variant_id !== variantId)
  localStorage.setItem('cart', JSON.stringify(cart))
  
  // Trigger navbar update  
  window.dispatchEvent(new Event('cartUpdated'))
}
```

---

## 🎨 Customization

### Change Announcement Messages

Edit `src/components/navigation/AnnouncementBar.tsx`:

```tsx
const announcements: Announcement[] = [
  { id: 1, message: '🎉 Your custom message here', link: '/promo' },
  { id: 2, message: '🚚 Another announcement', link: '/shipping' },
  // Add more...
]
```

### Adjust Search Debounce

Edit `src/components/navigation/SearchBar.tsx` (line ~82):

```tsx
}, 300) // Change to 500 for slower debounce
```

### Customize Category Quick Links

Edit `src/components/navigation/MegaMenu.tsx` (line ~140):

```tsx
<Link href="/your-link" onClick={onClose}>
  Your Link
</Link>
```

### Change Mobile Drawer Width

Edit `src/components/navigation/MobileDrawer.tsx` (line ~79):

```tsx
className="max-w-sm" // Change to max-w-md or max-w-lg
```

---

## 🐛 Troubleshooting

### Cart Count Not Updating

**Issue**: Badge shows wrong count

**Solution**: Make sure you're dispatching the event:

```tsx
window.dispatchEvent(new Event('cartUpdated'))
```

### Search Dropdown Not Showing

**Issue**: Search results not appearing

**Solution**: Check API response format and CORS settings:

```bash
# Check API response
curl http://localhost:3000/api/search?q=test

# Should return: { results: [...], total: N }
```

### Categories Not Appearing

**Issue**: Empty category bar

**Solution**: Verify database query returns data:

```sql
SELECT id, name, slug FROM categories 
WHERE is_active = true AND parent_id IS NULL
ORDER BY position;
```

### Mobile Drawer Won't Close

**Issue**: Drawer stays open after navigation

**Solution**: Verify `useEffect` in `MobileDrawer.tsx` listens to pathname changes.

### Search Results Show Wrong Images

**Issue**: Product images not displaying

**Solution**: Check image URL format in your database and API response.

---

## 📦 Database Requirements

Ensure your database has these structures:

### Categories Table

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id),
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);
```

### Products Search API

Your search function should support:

```sql
-- Example search query
SELECT 
  id, 
  name, 
  slug, 
  base_price, 
  image_url
FROM products
WHERE 
  is_active = true
  AND (
    name ILIKE '%' || $1 || '%'
    OR description ILIKE '%' || $1 || '%'
  )
LIMIT $2;
```

---

## ✅ Final Checklist

Before going live:

- [ ] Categories fetched and displayed correctly
- [ ] Search API working (products + categories)
- [ ] Cart badge updates on add/remove
- [ ] Wishlist count accurate
- [ ] Login modal opens correctly
- [ ] Logout works and redirects
- [ ] Mobile drawer functional
- [ ] Mega menu shows subcategories
- [ ] All links navigate correctly
- [ ] Responsive on all screen sizes
- [ ] No console errors
- [ ] Sticky navbar works on scroll

---

## 🎯 Next Steps

1. **Test on different devices** (mobile, tablet, desktop)
2. **Verify accessibility** (keyboard navigation, screen readers)
3. **Test with real data** (actual categories and products)
4. **Performance audit** (Lighthouse score)
5. **A/B test** announcement messages

---

## 📞 Support

Need help? Check:

- Full documentation: `NAVIGATION_SYSTEM_DOCS.md`
- API requirements: Ensure `/api/search` and `/api/admin/categories` work
- Component props: See TypeScript interfaces in each component

---

**Happy coding! 🚀**
