# Admin Routing Foundation

## Overview

This document defines the routing architecture for a fully isolated admin panel in a Next.js App Router project with existing user-facing routes.

**Goals:**
- Admin routes completely isolated from user routes
- Server-side role-based protection
- Scalable structure for future admin features
- Zero impact on existing user routes

---

## 1. FOLDER STRUCTURE

### Recommended Admin Route Tree

```
src/app/
├── (existing user routes)
│   ├── page.tsx                    ← Home
│   ├── shop/
│   ├── product/
│   ├── cart/
│   ├── checkout/
│   ├── account/
│   └── auth/
│
└── admin/                          ← ADMIN ROOT (isolated)
    ├── layout.tsx                  ← Admin root layout (protection)
    ├── page.tsx                    ← Dashboard (/admin)
    │
    ├── products/
    │   ├── page.tsx                ← Product list (/admin/products)
    │   ├── create/
    │   │   └── page.tsx            ← Create product
    │   └── [productId]/
    │       ├── page.tsx            ← Edit product
    │       └── variants/
    │           └── page.tsx        ← Manage variants
    │
    ├── orders/
    │   ├── page.tsx                ← Order list (/admin/orders)
    │   └── [orderId]/
    │       └── page.tsx            ← Order details + status update
    │
    ├── users/
    │   ├── page.tsx                ← User list (/admin/users)
    │   └── [userId]/
    │       └── page.tsx            ← User details + role management
    │
    ├── inventory/
    │   ├── page.tsx                ← Stock overview
    │   ├── alerts/
    │   │   └── page.tsx            ← Low stock alerts
    │   └── history/
    │       └── page.tsx            ← Stock movement history
    │
    ├── analytics/
    │   ├── page.tsx                ← Analytics dashboard
    │   ├── sales/
    │   │   └── page.tsx            ← Sales reports
    │   └── customers/
    │       └── page.tsx            ← Customer insights
    │
    ├── ai/
    │   ├── page.tsx                ← AI features hub
    │   ├── descriptions/
    │   │   └── page.tsx            ← Auto-generate product descriptions
    │   ├── recommendations/
    │   │   └── page.tsx            ← Product recommendation engine
    │   └── insights/
    │       └── page.tsx            ← AI-powered business insights
    │
    └── settings/
        ├── page.tsx                ← General settings
        ├── payment/
        │   └── page.tsx            ← Payment gateway config
        ├── shipping/
        │   └── page.tsx            ← Shipping rules
        └── notifications/
            └── page.tsx            ← Email/SMS templates
```

---

## 2. ADMIN LAYOUT STRATEGY

### Layout Hierarchy

```
src/app/
├── layout.tsx                      ← Root layout (applies to ALL routes)
│   └── <html>, <body>, fonts, global metadata
│
└── admin/
    └── layout.tsx                  ← Admin root layout
        ├── Role-based protection
        ├── Admin navigation
        ├── Admin-specific styles
        └── Breadcrumbs / page title
```

### Admin Layout Responsibilities

**1. Authentication & Authorization (Primary)**
```typescript
// src/app/admin/layout.tsx
import { getAdminUser } from '@/lib/admin/auth'
import { notFound } from 'next/navigation'

export default async function AdminLayout({ children }) {
  const adminUser = await getAdminUser()  // Returns user if admin, null otherwise
  
  if (!adminUser) {
    notFound()  // Returns 404 for non-admins (security through obscurity)
  }

  return (
    <div className="admin-container">
      <AdminSidebar />
      <main>{children}</main>
    </div>
  )
}
```

**Why 404 instead of 403?**
- Prevents revealing admin panel existence to unauthorized users
- Non-admins see "Page not found" instead of "Access denied"
- Standard practice for admin panels

**2. Admin-Specific UI Shell**
- Sidebar navigation
- Header with admin actions
- Breadcrumbs
- User menu (logout, profile)

**3. Styling Isolation**
- Admin-specific CSS variables
- Tailwind classes scoped to admin
- Prevents style conflicts with user-facing routes

**4. Metadata**
```typescript
export const metadata = {
  title: 'Admin Panel',
  robots: 'noindex, nofollow',  // Hide from search engines
}
```

---

## 3. ROUTE PROTECTION STRATEGY

### Two-Layer Defense

**Layer 1: Middleware (Session Check)**
- Runs on edge (fast)
- Checks if session cookie exists
- Redirects unauthenticated users to login

**Layer 2: Server Component (Role Check)**
- Runs in admin layout
- Verifies user role from database
- Returns 404 for non-admins

### Step-by-Step Protection Flow

```
User requests /admin/products
         ↓
    Middleware
         ↓
   Session cookie exists?
    ├─ NO → Redirect to /auth/login
    └─ YES → Continue
         ↓
   Admin Layout (Server Component)
         ↓
   Get user from database
         ↓
   User has admin role?
    ├─ NO → Return 404 (notFound)
    └─ YES → Render admin UI
         ↓
   /admin/products page renders
```

---

### Implementation Locations

#### **Middleware** (src/middleware.ts)

**Purpose:** Fast rejection of unauthenticated requests

**What to check:**
- ✅ Session cookie exists
- ✅ Path starts with `/admin`

**What NOT to check:**
- ❌ User role (requires database query)
- ❌ Specific permissions (too slow for edge)

**Implementation:**
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')
  
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }
  
  // Other protected routes (cart, checkout, account)
  // ...existing logic
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/cart', '/checkout', '/account/:path*']
}
```

**Why middleware?**
- Runs on edge → fast response
- No database round-trip
- Prevents anonymous access before page even renders

---

#### **Admin Layout** (src/app/admin/layout.tsx)

**Purpose:** Role-based authorization

**What to check:**
- ✅ User exists in database
- ✅ User has `role = 'admin'`

**What NOT to check:**
- ❌ Session cookie (already done in middleware)

**Implementation Pattern:**
```typescript
// src/app/admin/layout.tsx
import { getAdminUser } from '@/lib/admin/auth'
import { notFound } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // This function:
  // 1. Gets current user from session
  // 2. Queries database for role
  // 3. Returns user object if admin, null otherwise
  const adminUser = await getAdminUser()
  
  if (!adminUser) {
    notFound()  // Returns 404 page
  }

  return (
    <div className="admin-layout">
      <AdminNav adminUser={adminUser} />
      <main className="admin-content">{children}</main>
    </div>
  )
}
```

**Why in layout?**
- Runs once per route navigation (efficient)
- Protects all child pages automatically
- Server-side → cannot be bypassed by client manipulation

---

#### **Individual Admin Pages** (Optional Additional Checks)

**Purpose:** Feature-specific permissions (future)

**When to add:**
- Role is insufficient (e.g., "editor" vs "super admin")
- Need to log admin actions
- Need to check resource-specific access

**Example:**
```typescript
// src/app/admin/users/[userId]/page.tsx
import { requireAdmin } from '@/lib/admin/auth'

export default async function AdminUserDetailsPage({ params }) {
  const adminUser = await requireAdmin()  // Throws if not admin
  
  // Optional: Check if admin can manage this specific user
  // (e.g., prevent editing super admins)
  
  return <UserDetailsForm />
}
```

**When NOT needed:**
- Layout already enforces admin role
- No feature-specific permissions required
- Just fetching admin data (layout protection is enough)

---

## 4. CLEAR DOs AND DON'Ts

### ✅ DO

**Route Organization:**
- Keep all admin routes under `/admin`
- Use nested folders for features (`/admin/products/[productId]/variants`)
- Mirror data structure in route structure (intuitive URLs)

**Protection:**
- Always use server components for admin pages
- Check session in middleware (fast)
- Check role in admin layout (secure)
- Return 404 for non-admins (not 403)

**Data Access:**
- Use admin-specific server actions (`src/lib/admin/actions/*`)
- Import from `@/lib/supabase/admin` in admin code only
- Always call `requireAdmin()` in admin actions

**Scaling:**
- Add new features as subfolders under `/admin`
- Create feature-specific layouts for complex sections
- Use route groups `(feature)` for shared layouts without URL segments

**Metadata:**
- Set `robots: 'noindex, nofollow'` in admin layout
- Use descriptive titles for SEO in dev (e.g., "Product Management - Admin")

---

### ❌ DON'T

**Route Organization:**
- Don't mix admin routes with user routes (e.g., `/products/admin`)
- Don't create separate admin subdomains until necessary
- Don't use query params for admin routes (e.g., `/products?admin=true`)

**Protection:**
- Don't check admin role in middleware (too slow for edge)
- Don't rely on client-side checks (`'use client'` + role state)
- Don't use 403 status (reveals admin panel existence)
- Don't protect individual admin pages if layout already does

**Data Access:**
- Don't import `supabaseAdmin` in user-facing code
- Don't mix admin and user logic in same actions
- Don't skip `requireAdmin()` calls in admin actions

**UI Concerns:**
- Don't share components between admin and user routes (prevents coupling)
- Don't use user layout styling in admin (visual isolation)
- Don't expose admin API routes publicly (e.g., `/api/admin/*` without guards)

**Common Mistakes:**
- Don't fetch admin data in client components (leaks data to browser)
- Don't pass sensitive admin state via URL params or localStorage
- Don't create backdoor routes (e.g., `/super-secret-admin`)

---

## 5. PROTECTION CHECKLIST

Before deploying admin routes:

### Middleware
- [ ] Admin routes require session cookie (`/admin/:path*`)
- [ ] Unauthenticated users redirected to `/auth/login`
- [ ] Middleware matcher includes `/admin/:path*`

### Layout
- [ ] Admin layout calls `getAdminUser()`
- [ ] Non-admin users see 404 (via `notFound()`)
- [ ] Admin layout is async server component
- [ ] Layout fetches user once (not per page)

### Pages
- [ ] All admin pages are server components (default)
- [ ] No admin pages use `'use client'` unnecessarily
- [ ] Admin pages import from `@/lib/admin/actions/*`

### Actions
- [ ] All admin actions call `requireAdmin()` or use `withAdminGuard()`
- [ ] Admin actions use `supabaseAdmin` client
- [ ] Admin actions prefixed with `admin*` (naming convention)

### Metadata
- [ ] Admin layout sets `robots: 'noindex, nofollow'`
- [ ] Page titles include "Admin" suffix
- [ ] No admin routes in public sitemap

---

## 6. SCALING PATTERNS

### Adding New Admin Features

**Pattern 1: Simple Feature (Single Page)**
```
admin/
└── reports/
    └── page.tsx            ← GET /admin/reports
```

**Pattern 2: CRUD Feature (Multiple Pages)**
```
admin/
└── categories/
    ├── page.tsx            ← List
    ├── create/
    │   └── page.tsx        ← Create
    └── [categoryId]/
        └── page.tsx        ← Edit/Delete
```

**Pattern 3: Complex Feature (Nested Resources)**
```
admin/
└── campaigns/
    ├── page.tsx            ← Campaign list
    ├── create/
    │   └── page.tsx        ← Create campaign
    └── [campaignId]/
        ├── page.tsx        ← Campaign details
        ├── edit/
        │   └── page.tsx    ← Edit campaign
        └── emails/
            ├── page.tsx    ← Email list for campaign
            └── [emailId]/
                └── page.tsx ← Email details
```

**Pattern 4: Feature with Shared Layout**
```
admin/
└── ai/
    ├── layout.tsx          ← AI feature layout (tabs, nav)
    ├── page.tsx            ← AI hub
    ├── descriptions/
    │   └── page.tsx        ← Tab: Descriptions
    └── recommendations/
        └── page.tsx        ← Tab: Recommendations
```

---

### Future-Proofing

**When to Create Nested Layouts:**
- Feature has 3+ subpages
- Shared navigation/tabs needed
- Feature-specific loading states

**When to Use Route Groups:**
```
admin/
└── (products)/            ← Route group (no URL segment)
    ├── layout.tsx         ← Shared layout
    ├── inventory/
    │   └── page.tsx       ← /admin/inventory
    └── variants/
        └── page.tsx       ← /admin/variants
```
**Benefit:** Shared layout without adding `/products` to URL

**When to Split Admin Features:**
- Feature has 10+ pages
- Different permission levels needed
- Performance concerns (lazy loading)

---

## 7. INTEGRATION WITH EXISTING ROUTES

### Zero-Impact Migration

**Existing Routes (UNCHANGED):**
```
src/app/
├── shop/page.tsx              ← User-facing (no changes)
├── product/[slug]/page.tsx    ← User-facing (no changes)
├── cart/page.tsx              ← User-facing (no changes)
└── account/orders/page.tsx    ← User-facing (no changes)
```

**New Admin Routes (ISOLATED):**
```
src/app/admin/
├── products/page.tsx          ← Admin product management
└── orders/page.tsx            ← Admin order management
```

**No Conflicts:**
- User sees `/product/blue-shirt` → Product detail page
- Admin sees `/admin/products` → Product management dashboard
- Different layouts, different data access, different permissions

---

### Shared Components (If Needed)

**Bad: Mixing contexts**
```
components/
└── ProductCard.tsx            ← Used in both user + admin routes (confusing)
```

**Good: Separate components**
```
components/
├── ProductCard.tsx            ← User-facing only
└── admin/
    └── ProductListItem.tsx    ← Admin-only
```

**Alternative: Shared but Contextual**
```typescript
// components/ProductCard.tsx
export function ProductCard({ product, variant = 'user' }) {
  if (variant === 'admin') {
    return <AdminProductCard product={product} />
  }
  return <UserProductCard product={product} />
}
```

---

## 8. ERROR HANDLING

### Admin Route Error Boundaries

**Layout-Level Error:**
```typescript
// src/app/admin/error.tsx
'use client'

export default function AdminError({ error, reset }) {
  return (
    <div className="admin-error">
      <h1>Admin Error</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )
}
```

**Not Found (404):**
```typescript
// src/app/admin/not-found.tsx
export default function AdminNotFound() {
  return (
    <div>
      <h1>Admin Page Not Found</h1>
      <Link href="/admin">Back to Dashboard</Link>
    </div>
  )
}
```

**Loading States:**
```typescript
// src/app/admin/products/loading.tsx
export default function ProductsLoading() {
  return <AdminSkeleton />
}
```

---

## 9. EXAMPLE FLOW

### User Journey: Admin Views Orders

**1. User navigates to `/admin/orders`**

**2. Middleware runs:**
```typescript
// Check: session cookie exists?
if (!session) {
  redirect('/auth/login')  // STOP: Not logged in
}
// PASS: Continue to page
```

**3. Admin Layout runs:**
```typescript
// Query: Get user from database
const user = await getCurrentUser()
const { data } = await supabase
  .from('users')
  .select('role')
  .eq('firebase_uid', user.uid)
  .single()

// Check: User is admin?
if (data.role !== 'admin') {
  notFound()  // STOP: Not an admin (returns 404)
}
// PASS: Render admin layout + children
```

**4. Orders Page runs:**
```typescript
// Fetch: All orders (unrestricted)
const orders = await adminListAllOrders()

// Render: Admin order list
return <OrderTable orders={orders} />
```

---

## SUMMARY

### Key Principles

1. **Isolation**
   - Admin routes under `/admin`
   - Admin logic in `src/lib/admin/*`
   - No shared code between admin and user contexts

2. **Two-Layer Protection**
   - Middleware: Session check (fast edge computation)
   - Layout: Role check (secure database query)

3. **404 Over 403**
   - Non-admins see "not found"
   - Prevents revealing admin panel existence

4. **Server-First**
   - All admin pages are server components
   - All admin actions run on server
   - No client-side admin state

5. **Scalable Structure**
   - Nested folders for features
   - Route groups for shared layouts
   - Feature-specific layouts when needed

### Next Steps (Implementation)

1. ✅ Middleware protects `/admin/*` (session check)
2. ✅ Create `src/app/admin/layout.tsx` (role check)
3. Add admin pages as needed (follow folder structure)
4. Create admin actions in `src/lib/admin/actions/*`
5. Test protection flow (non-admin → 404, admin → dashboard)

**Admin routing foundation complete. Ready to scale.**
