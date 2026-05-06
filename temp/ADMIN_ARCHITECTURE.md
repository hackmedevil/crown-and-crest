# Admin Foundation Architecture

## 1. FOLDER STRUCTURE

```
src/
├── app/
│   ├── admin/                    ← NEW: Admin route group
│   │   ├── layout.tsx            ← Admin-specific layout (guards all sub-routes)
│   │   ├── page.tsx              ← Dashboard (/admin)
│   │   ├── products/
│   │   │   └── page.tsx          ← Product management
│   │   ├── orders/
│   │   │   └── page.tsx          ← Order management
│   │   ├── users/
│   │   │   └── page.tsx          ← User management
│   │   └── settings/
│   │       └── page.tsx          ← Store settings
│   │
│   ├── (existing routes unchanged)
│   ├── auth/
│   ├── cart/
│   ├── checkout/
│   └── account/
│
├── lib/
│   ├── admin/                    ← NEW: Admin utilities
│   │   └── auth.ts               ← Role checking helpers
│   └── (existing libs)
│
└── middleware.ts                 ← UPDATED: Protect /admin routes
```

---

## 2. ADMIN LAYOUT STRATEGY

### Approach: Route Group Layout
- `/admin` has **its own layout.tsx** that wraps all admin routes
- Admin layout **replaces** the root layout (no user Header/Footer)
- Layout enforces admin role check **once** for all child routes

### Benefits:
✅ Complete UI isolation (admin navbar ≠ user navbar)  
✅ Single auth checkpoint (layout guards all admin pages)  
✅ No conflicts with user routes (separate layout tree)  
✅ Easy to add admin-specific providers/context

### File: `src/app/admin/layout.tsx`
```typescript
// Enforces admin-only access
// Returns 404 for non-admins (hides admin routes)
// Provides admin navigation
```

---

## 3. AUTH + ROLE GUARD APPROACH

### Role Storage
**Database Schema** (Supabase):
```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer';
CREATE INDEX idx_users_role ON users(role);

-- Possible values: 'customer', 'admin'
```

### Role Checking Flow
```
Request → Middleware (session exists?) 
         → Admin Layout (role = admin?)
         → Admin Page (renders)
```

### Helper Functions (`src/lib/admin/auth.ts`):

1. **`isAdmin()`**: Returns boolean
   - Calls `getCurrentUser()` (reuses existing auth)
   - Queries `users.role` from Supabase
   - Returns true if `role === 'admin'`

2. **`requireAdmin()`**: Throws if not admin
   - Use in server actions/API routes
   - Prevents non-admins from mutating data

3. **`getAdminUser()`**: Returns user object or null
   - Used in admin layout to show admin info

---

## 4. MIDDLEWARE VS SERVER GUARD DECISION

### ✅ CHOSEN STRATEGY: Hybrid (Both)

**Middleware** (`src/middleware.ts`):
- ✅ Checks if `/admin/*` user has **any session**
- ✅ Redirects to login if no session
- ❌ Does NOT check role (can't query DB in Edge middleware efficiently)

**Server Guard** (`src/app/admin/layout.tsx`):
- ✅ Checks if user has **admin role**
- ✅ Returns `notFound()` for non-admins (hides admin routes)
- ✅ Runs once per request (layout wraps all admin pages)

### Why This Split?

| Layer | Purpose | When It Runs |
|-------|---------|--------------|
| Middleware | Fast rejection (no session) | Every request to `/admin/*` |
| Layout | Role verification | Once per page navigation |

**Alternative Considered (Rejected):**
- ❌ Middleware + DB query: Too slow (Edge runtime limits)
- ❌ Per-page guards: Redundant (DRY violation)

---

## 5. ROUTE ISOLATION STRATEGY

### How Admin Routes Stay Isolated

**1. Separate Layout Tree**
```
User routes:     app/layout.tsx → Header/Footer → page
Admin routes:    app/admin/layout.tsx → Admin Nav → page
```
- Admin layout **does not** inherit user layout
- Admin pages render inside admin layout only

**2. URL Namespace**
```
/admin/*         ← Admin only
/cart, /account  ← User only (no overlap)
```

**3. Component Reuse**
- ✅ Can import from `src/components` (e.g., ProductCard)
- ✅ Can import from `src/lib` (e.g., Supabase clients)
- ❌ Admin components stay in `src/app/admin/components` (future)

**4. Data Layer**
- Both use same Supabase client (`supabaseAdmin`)
- Role-based queries filter data appropriately
- Example: `getUserOrders(uid)` vs `getAllOrders()`

---

## 6. ADDING FIRST ADMIN USER

### Step 1: Create User via UI
1. Normal user signs up via phone OTP
2. Firebase creates user, session cookie set

### Step 2: Promote to Admin
Run SQL in Supabase:
```sql
-- Find user by phone/email/uid
SELECT * FROM users WHERE firebase_uid = 'xxx';

-- Promote to admin
UPDATE users 
SET role = 'admin' 
WHERE firebase_uid = 'xxx';
```

### Step 3: Verify Access
1. Navigate to `/admin`
2. If middleware redirects → check session cookie
3. If 404 appears → check role query in `isAdmin()`

---

## 7. EXTENDING ADMIN ROUTES

### Add New Admin Page
```bash
# Example: Add analytics page
src/app/admin/analytics/page.tsx
```

```typescript
export default async function AdminAnalyticsPage() {
  // Auto-protected by admin layout
  return <div>Analytics Dashboard</div>
}
```

**No extra guards needed** — layout handles it!

### Add Admin API Route
```bash
src/app/api/admin/products/route.ts
```

```typescript
import { requireAdmin } from '@/lib/admin/auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  await requireAdmin() // Throws if not admin
  
  // Admin-only logic here
  return NextResponse.json({ success: true })
}
```

---

## 8. FUTURE-PROOFING

### Multi-Role Support (Later)
```typescript
// Add more roles
type Role = 'customer' | 'admin' | 'manager' | 'support'

// Update isAdmin to hasRole
export async function hasRole(role: Role): Promise<boolean> {
  // ...
}
```

### Permission Granularity (Later)
```typescript
// Add permissions table
permissions: { user_id, resource, action }

// Check specific permission
export async function can(action: string, resource: string) {
  // ...
}
```

### Audit Logging (Later)
```typescript
// Log admin actions
export async function logAdminAction(action: string, metadata: any) {
  await supabaseAdmin.from('admin_logs').insert({
    user_id: getCurrentUser().uid,
    action,
    metadata,
    timestamp: new Date(),
  })
}
```

---

## 9. SECURITY CHECKLIST

✅ Admin routes hidden from non-admins (404, not 403)  
✅ Layout-level guard (single checkpoint)  
✅ Middleware rejects unauthenticated early  
✅ Server actions use `requireAdmin()` for mutations  
✅ Role stored in database (not in cookie)  
✅ No admin role exposed to client

---

## 10. TESTING ADMIN ACCESS

### Test as Non-Admin
1. Sign up as regular user
2. Navigate to `/admin` → Expect 404
3. Try `fetch('/api/admin/...')` → Expect 401/403

### Test as Admin
1. Promote user to admin (SQL)
2. Navigate to `/admin` → Expect dashboard
3. Try admin actions → Expect success

### Test Session Expiry
1. Clear cookies
2. Navigate to `/admin` → Expect redirect to `/auth/login`

---

## SUMMARY

**Admin Foundation Ready ✅**

- **Structure**: Route group with isolated layout
- **Protection**: Middleware + layout guard
- **Role Check**: Database query (`users.role`)
- **Isolation**: Separate layout tree, no user route conflicts
- **Extensible**: Add pages/routes without extra guards

**Next Steps:**
1. Add `role` column to Supabase `users` table
2. Promote first admin user via SQL
3. Build admin UI pages (products, orders, etc.)
4. Add admin server actions with `requireAdmin()`
