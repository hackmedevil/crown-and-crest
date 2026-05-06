# Navigation System Architecture

## 📐 Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                         App Layout                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    NavbarWrapper                          │  │
│  │  (Client Component - Handles Auth & State)               │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │                    Navbar                           │ │  │
│  │  │  (Main Navigation Component)                        │ │  │
│  │  │                                                     │ │  │
│  │  │  ┌──────────────────────────────────────────────┐  │ │  │
│  │  │  │        AnnouncementBar                       │  │ │  │
│  │  │  │  • Rotating messages                         │  │ │  │
│  │  │  │  • Quick links                               │  │ │  │
│  │  │  │  • Progress dots                             │  │ │  │
│  │  │  └──────────────────────────────────────────────┘  │ │  │
│  │  │                                                     │ │  │
│  │  │  ┌──────────────────────────────────────────────┐  │ │  │
│  │  │  │        Main Navbar (Desktop & Mobile)        │  │ │  │
│  │  │  │                                              │  │ │  │
│  │  │  │  ┌────────┐  ┌──────────┐  ┌────────────┐  │  │ │  │
│  │  │  │  │  Logo  │  │ SearchBar│  │   Icons    │  │  │ │  │
│  │  │  │  └────────┘  └──────────┘  └────────────┘  │  │ │  │
│  │  │  │       │            │              │         │  │ │  │
│  │  │  │       │            │         ┌────┴────┐   │  │ │  │
│  │  │  │       │            │         │         │   │  │ │  │
│  │  │  │       │            │    ┌────▼────┐  ┌─▼──┐│  │ │  │
│  │  │  │       │            │    │ Account │  │Cart││  │ │  │
│  │  │  │       │            │    │Dropdown │  │Icon││  │ │  │
│  │  │  │       │            │    └─────────┘  └────┘│  │ │  │
│  │  │  │       │            │                        │  │ │  │
│  │  │  │       │        ┌───▼─────────────┐          │  │ │  │
│  │  │  │       │        │ Autocomplete    │          │  │ │  │
│  │  │  │       │        │ Dropdown        │          │  │ │  │
│  │  │  │       │        │ • Products      │          │  │ │  │
│  │  │  │       │        │ • Categories    │          │  │ │  │
│  │  │  │       │        │ • Recent        │          │  │ │  │
│  │  │  │       │        └─────────────────┘          │  │ │  │
│  │  │  └───────┼───────────────────────────────────┬─┘  │ │  │
│  │  │          │                                   │    │ │  │
│  │  │          │  ┌──────────────────────────────┐ │    │ │  │
│  │  │          │  │   NavbarCategories (Desktop) │ │    │ │  │
│  │  │          │  │                              │ │    │ │  │
│  │  │          │  │  [Men] [Women] [New] [Sale] │ │    │ │  │
│  │  │          │  │    │                         │ │    │ │  │
│  │  │          │  │    └──────┬──────────────────┘ │    │ │  │
│  │  │          │  │           │                    │    │ │  │
│  │  │          │  │      ┌────▼──────────────┐    │    │ │  │
│  │  │          │  │      │    MegaMenu       │    │    │ │  │
│  │  │          │  │      │  • Subcategories  │    │    │ │  │
│  │  │          │  │      │  • Featured image │    │    │ │  │
│  │  │          │  │      │  • Quick links    │    │    │ │  │
│  │  │          │  │      └───────────────────┘    │    │ │  │
│  │  │          │  └──────────────────────────────┘     │ │  │
│  │  │          │                                       │ │  │
│  │  │          └────────────┬──────────────────────────┘ │  │
│  │  │                       │                            │  │
│  │  │               ┌───────▼────────────┐               │  │
│  │  │               │  MobileDrawer      │               │  │
│  │  │               │  (Mobile Only)     │               │  │
│  │  │               │  • User section    │               │  │
│  │  │               │  • Categories      │               │  │
│  │  │               │  • Quick links     │               │  │
│  │  │               │  • Contact         │               │  │
│  │  │               └────────────────────┘               │  │
│  │  └─────────────────────────────────────────────────────┘ │
│  └───────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### Authentication Flow
```
User Action → NavbarWrapper → useAuth() → Navbar Props
                 ↓
         [isLoggedIn, firstName]
                 ↓
    ┌────────────┴────────────┐
    ↓                         ↓
AccountDropdown          MobileDrawer
```

### Search Flow
```
User Types → SearchBar (debounce 300ms)
                 ↓
          API Calls (parallel)
            ↓         ↓
     /api/search   /api/admin/categories
            ↓         ↓
        Products  Categories
            ↓         ↓
       Autocomplete Dropdown
```

### Cart Update Flow
```
Add to Cart → localStorage.setItem()
                 ↓
     window.dispatchEvent('cartUpdated')
                 ↓
    NavbarWrapper useEffect listener
                 ↓
          setCartCount(newCount)
                 ↓
         CartIcon updates badge
```

### Category Navigation Flow
```
Hover Category → NavbarCategories sets activeCategory
                      ↓
              MegaMenu receives category data
                      ↓
              Renders subcategories + image
                      ↓
          Mouse leave → delay 150ms → close
```

---

## 🎨 Styling Architecture

### Responsive Breakpoints
```
Mobile:  < 768px   → Hamburger menu, mobile drawer
Tablet:  768-1024  → Partial desktop nav
Desktop: > 1024px  → Full navigation with mega menus
```

### Z-Index Layers
```
50  → Sticky navbar
40  → Mega menus
30  → Dropdowns
20  → Modals (mobile drawer)
10  → Overlays (backdrop)
```

### Color Scheme
```
Background:  white
Text:        black → gray-700 → gray-500
Hover:       black
Active:      black with underline
Accent:      red-600 (for Sale)
Badge:       black with white text
```

---

## 🔌 External Dependencies

### Required APIs
```
GET /api/search?q={query}&limit=5
→ Returns: { results: Product[], total: number }

GET /api/admin/categories?search={query}&active=true
→ Returns: { categories: Category[] }
```

### Required Context
```typescript
useAuth() {
  user: { first_name: string } | null
  openLoginModal: () => void
  logout: () => void
}
```

### LocalStorage Keys
```
'cart' → CartItem[]
'wishlist' → string[] (product IDs)
'recentSearches' → string[]
```

---

## ⚡ Event System

### Custom Events
```javascript
// Dispatched by: Cart operations
window.dispatchEvent(new Event('cartUpdated'))

// Dispatched by: Wishlist operations
window.dispatchEvent(new Event('wishlistUpdated'))

// Listened by: NavbarWrapper
window.addEventListener('cartUpdated', updateCounts)
```

### Built-in Events
```javascript
// Window scroll → Navbar shadow effect
window.addEventListener('scroll', handleScroll)

// Click outside → Close dropdowns
document.addEventListener('mousedown', handleClickOutside)

// Escape key → Close mobile drawer
document.addEventListener('keydown', handleEscape)
```

---

## 📦 Component Dependencies

### SearchBar Dependencies
```
→ /api/search (products)
→ /api/admin/categories (categories)
→ localStorage (recent searches)
→ Next.js Image (product images)
```

### AccountDropdown Dependencies
```
→ useAuth context (user data)
→ /api/auth/logout (logout endpoint)
→ Next.js useRouter (navigation)
```

### CartIcon Dependencies
```
→ localStorage ('cart', 'wishlist')
→ window events ('cartUpdated')
→ Next.js Link (navigation)
```

### MegaMenu Dependencies
```
→ Category data (from props)
→ Next.js Image (category images)
→ Next.js Link (navigation)
```

---

## 🎯 Performance Optimizations

### Network
```
✅ Debounced search (300ms)
✅ Parallel API calls (Promise.all)
✅ Limit search results (5 products)
✅ Image optimization (Next.js Image)
```

### Rendering
```
✅ Conditional rendering (mega menus)
✅ Event cleanup (useEffect returns)
✅ Minimal state updates
✅ React.memo potential spots identified
```

### Storage
```
✅ LocalStorage caching (recent searches)
✅ Session persistence (cart/wishlist)
✅ Efficient JSON parsing
```

---

## 🔐 Security Considerations

### Input Sanitization
```typescript
// Search query sanitization
const query = searchParams.get('q')?.trim()

// Category slug validation
.eq('is_active', true) // Only active categories
```

### XSS Prevention
```typescript
// React auto-escapes by default
// Image URLs validated by Next.js
// Links use Next.js Link component
```

### Authentication
```typescript
// Auth checks in API routes
await requireAuth() // Server-side validation
```

---

## 📱 Mobile-Specific Features

### Touch Optimizations
```
→ Large tap targets (44px minimum)
→ Swipe-to-open drawer (future)
→ Touch-friendly dropdowns
→ Horizontal scroll categories
```

### Mobile-Only Components
```
→ Hamburger menu button
→ Mobile drawer (full-screen)
→ Expandable search bar
→ Simplified account menu
```

### Responsive Images
```
→ Smaller product thumbnails
→ Lazy loading enabled
→ Appropriate sizes attribute
```

---

## 🎓 Code Patterns Used

### State Management
```typescript
// Local state for UI
const [isOpen, setIsOpen] = useState(false)

// Derived state
const hasResults = results.length > 0

// Effect for side effects
useEffect(() => { /* ... */ }, [deps])
```

### Event Handling
```typescript
// Debounced input
const timeoutId = setTimeout(async () => {
  await fetchResults()
}, 300)

// Cleanup
return () => clearTimeout(timeoutId)
```

### Conditional Rendering
```typescript
// Short-circuit evaluation
{isOpen && <Dropdown />}

// Ternary for alternatives
{isLoggedIn ? <Profile /> : <Login />}

// Null coalescing
categories ?? []
```

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] All components TypeScript-clean
- [ ] No console errors in browser
- [ ] Mobile responsive tested
- [ ] Search API working
- [ ] Categories loading
- [ ] Cart updates working
- [ ] Authentication functional

### Post-deployment
- [ ] Monitor search analytics
- [ ] Track cart conversion
- [ ] Check mobile usage
- [ ] Verify load times
- [ ] Watch for errors

---

Built with modern React patterns and Next.js best practices 🎯
