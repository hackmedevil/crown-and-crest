# Admin Data Access Pattern

## Current State Analysis

### Existing Clients
```typescript
// src/lib/supabase/admin.ts
supabaseAdmin = createClient(url, SERVICE_ROLE_KEY)

// src/lib/supabase/server.ts
supabaseServer = createClient(url, SERVICE_ROLE_KEY)  // ⚠️ SAME KEY
```

**Problem:** Both use SERVICE_ROLE → bypasses RLS → unsafe for user routes

---

## 1. CLIENT USAGE PATTERN

### **supabaseAdmin** (Unrestricted)
**Use ONLY in:**
- ✅ Admin-only server actions (`src/lib/admin/actions/*.ts`)
- ✅ Admin API routes (`src/app/api/admin/*`)
- ✅ Admin page server components (if needed)
- ✅ System-level operations (order creation, payment verification)

**Never use in:**
- ❌ User-facing page components
- ❌ Shared utility functions
- ❌ Client components

**Why:** Bypasses RLS, can read/write any data

---

### **supabaseServer** (User-scoped)
**Should be converted to:**
```typescript
// Future: Use ANON key + RLS policies
supabaseServer = createClient(url, ANON_KEY)
```

**Use in:**
- ✅ User route server actions (`src/lib/cart/actions.ts`, `src/lib/orders/actions.ts`)
- ✅ User page components
- ✅ Shared utility functions

**Pattern:**
```typescript
// Always scope by user
const { data } = await supabaseServer
  .from('cart_items')
  .select('*')
  .eq('firebase_uid', uid)  // ← Always filter by user
```

**Never:**
```typescript
// ❌ Don't rely on SERVICE_ROLE scoping
const { data } = await supabaseServer
  .from('cart_items')
  .select('*')  // Returns ALL users' data (bad!)
```

---

### **supabaseClient** (Browser)
**Future addition:**
```typescript
// src/lib/supabase/client.ts
supabaseClient = createClient(url, ANON_KEY)
```

**Use in:**
- ✅ Client components
- ✅ Browser-side queries (rare)

---

## 2. PREVENTING ACCIDENTAL ADMIN ACCESS

### Strategy 1: File Location Isolation

**Rule:** Admin clients never leave admin folders

```
src/lib/
├── admin/
│   ├── actions/
│   │   ├── products.ts      ← Uses supabaseAdmin
│   │   ├── orders.ts        ← Uses supabaseAdmin
│   │   └── users.ts         ← Uses supabaseAdmin
│   └── auth.ts              ← Uses supabaseAdmin (role check)
│
├── cart/
│   └── actions.ts           ← Uses supabaseServer (user-scoped)
├── orders/
│   └── actions.ts           ← Uses supabaseServer (user-scoped)
└── supabase/
    ├── admin.ts             ← Exports supabaseAdmin
    ├── server.ts            ← Exports supabaseServer
    └── client.ts            ← Exports supabaseClient (future)
```

**Import Rule:**
```typescript
// ✅ ALLOWED: Admin action imports admin client
// src/lib/admin/actions/products.ts
import { supabaseAdmin } from '@/lib/supabase/admin'

// ❌ FORBIDDEN: User action imports admin client
// src/lib/cart/actions.ts
import { supabaseAdmin } from '@/lib/supabase/admin'  // ← LINT ERROR
```

---

### Strategy 2: Naming Conventions

**Admin Actions:** Prefix with `admin*`
```typescript
// src/lib/admin/actions/products.ts
export async function adminCreateProduct(data: ProductInput)
export async function adminUpdateProduct(id: string, data: ProductInput)
export async function adminDeleteProduct(id: string)
export async function adminListAllProducts()  // No user filter
```

**User Actions:** No prefix, always user-scoped
```typescript
// src/lib/cart/actions.ts
export async function getCart(uid: string)      // ← Requires uid
export async function addToCart(uid: string, productId: string)
export async function removeFromCart(uid: string, itemId: string)
```

**Naming Signal:**
- `admin*` → unrestricted, uses supabaseAdmin
- No prefix → user-scoped, uses supabaseServer

---

### Strategy 3: Type Safety Guards

**Admin Action Wrapper:**
```typescript
// src/lib/admin/actions/_base.ts
export async function withAdminGuard<T>(
  fn: () => Promise<T>
): Promise<T> {
  await requireAdmin()  // Throws if not admin
  return fn()
}

// Usage in admin action:
export async function adminDeleteProduct(id: string) {
  return withAdminGuard(async () => {
    // Admin logic here
  })
}
```

**Benefit:** Every admin action explicitly guarded

---

### Strategy 4: Linting Rules (Future)

**ESLint Custom Rule:**
```javascript
// .eslintrc.js (pseudo-code)
{
  rules: {
    'no-admin-import-in-user-code': [
      'error',
      {
        // Forbid importing supabaseAdmin outside src/lib/admin
        forbidImport: '@/lib/supabase/admin',
        outsidePath: 'src/lib/admin/**'
      }
    ]
  }
}
```

---

## 3. FILE ORGANIZATION UNDER src/lib

### Recommended Structure

```
src/lib/
├── admin/                          ← ADMIN ONLY (unrestricted access)
│   ├── actions/
│   │   ├── _base.ts               ← Admin guard wrapper
│   │   ├── products.ts            ← Product CRUD (no user filter)
│   │   ├── orders.ts              ← Order management (all orders)
│   │   ├── users.ts               ← User management (roles, etc.)
│   │   └── analytics.ts           ← Aggregated stats (all data)
│   ├── auth.ts                    ← isAdmin(), requireAdmin()
│   └── types.ts                   ← Admin-specific types
│
├── cart/                           ← USER-SCOPED
│   └── actions.ts                 ← Always requires uid
│
├── orders/                         ← USER-SCOPED
│   └── actions.ts                 ← Always filters by uid
│
├── products/                       ← SHARED (read-only for users)
│   └── queries.ts                 ← Public product queries
│
├── auth.ts                         ← User auth (getCurrentUser)
├── razorpay.ts                     ← Payment utilities
│
└── supabase/
    ├── admin.ts                   ← SERVICE_ROLE client
    ├── server.ts                  ← User-scoped client
    └── client.ts                  ← Browser client (future)
```

---

### Access Matrix

| File Location | Can Import | Client Used | Scope |
|---------------|-----------|-------------|-------|
| `lib/admin/actions/*` | supabaseAdmin | Admin | Unrestricted |
| `lib/cart/actions.ts` | supabaseServer | Server | User-scoped (uid) |
| `lib/orders/actions.ts` | supabaseServer | Server | User-scoped (uid) |
| `lib/products/queries.ts` | supabaseServer | Server | Public (no uid) |
| `app/admin/**` pages | admin actions | - | Via server actions |
| `app/cart/**` pages | cart actions | - | Via server actions |

---

## 4. NAMING CONVENTIONS

### Action Names

**Admin Actions (Unrestricted):**
```
Pattern: admin<Verb><Noun>
Examples:
  - adminCreateProduct
  - adminUpdateOrder
  - adminDeleteUser
  - adminListAllOrders      ← "All" signals unrestricted
  - adminGetOrderById       ← No uid param needed
  - adminBulkUpdateProducts
```

**User Actions (Scoped):**
```
Pattern: <verb><Noun>
Examples:
  - getCart(uid)             ← Always requires uid param
  - getUserOrders(uid)
  - createOrder(uid, data)
  - updateUserProfile(uid, data)
```

**Public Queries (No Auth):**
```
Pattern: get<Noun> OR list<Noun>
Examples:
  - getProductBySlug(slug)
  - listProducts(filters?)
  - searchProducts(query)
```

---

### File Names

**Admin:**
```
src/lib/admin/actions/products.ts      ← Plural (manages collection)
src/lib/admin/actions/orders.ts
src/lib/admin/actions/users.ts
```

**User:**
```
src/lib/cart/actions.ts                ← User's cart (singular context)
src/lib/orders/actions.ts              ← User's orders
src/lib/profile/actions.ts             ← User's profile
```

**Shared:**
```
src/lib/products/queries.ts            ← Read-only, public
src/lib/analytics/client.ts            ← Utilities
```

---

### Variable Names

**In Admin Actions:**
```typescript
// ✅ Clear: unrestricted query
const allOrders = await supabaseAdmin.from('orders').select('*')

// ✅ Clear: admin performing action
const updatedProduct = await supabaseAdmin
  .from('products')
  .update(data)
  .eq('id', productId)
```

**In User Actions:**
```typescript
// ✅ Clear: scoped to user
const userCart = await supabaseServer
  .from('cart_items')
  .select('*')
  .eq('firebase_uid', uid)

// ✅ Clear: user's data
const userOrders = await supabaseServer
  .from('orders')
  .select('*')
  .eq('firebase_uid', uid)
```

---

## 5. SAFETY CHECKLIST

Before deploying to production:

### Admin Routes
- [ ] All admin pages import from `lib/admin/actions/*`
- [ ] All admin actions use `supabaseAdmin`
- [ ] All admin actions call `requireAdmin()` or `withAdminGuard()`
- [ ] Admin layout returns 404 for non-admins (not 403)

### User Routes
- [ ] No user page imports from `lib/admin/*`
- [ ] All user actions accept `uid` parameter
- [ ] All user queries filter by `firebase_uid`
- [ ] User actions use `supabaseServer` (or future ANON client)

### Shared Code
- [ ] Product queries are read-only
- [ ] No sensitive data exposed (prices OK, internal notes NOT OK)
- [ ] Public queries use pagination

---

## 6. MIGRATION PLAN (Future)

### Phase 1: Separate Admin Client ✅ (Done)
- Admin code uses `supabaseAdmin`
- User code uses `supabaseServer`

### Phase 2: Convert User Client (Next)
```typescript
// src/lib/supabase/server.ts
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // ← Change from SERVICE_ROLE
  { auth: { persistSession: false } }
)
```

**Then enable RLS:**
```sql
-- Cart items: users can only see their own
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own cart"
  ON cart_items FOR SELECT
  USING (firebase_uid = current_setting('app.user_id')::text);

-- Orders: users can only see their own
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own orders"
  ON orders FOR SELECT
  USING (firebase_uid = current_setting('app.user_id')::text);
```

**Update actions to pass uid to RLS:**
```typescript
// Before query, set user context
await supabaseServer.rpc('set_config', {
  setting: 'app.user_id',
  value: uid
})
```

### Phase 3: Add Browser Client
```typescript
// src/lib/supabase/client.ts
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 7. ANTI-PATTERNS TO AVOID

### ❌ Don't: Mix admin and user logic
```typescript
// BAD: One action for both contexts
export async function getOrders(uid?: string) {
  if (uid) {
    return supabaseServer.from('orders').eq('firebase_uid', uid)
  } else {
    return supabaseAdmin.from('orders').select('*')  // Admin path
  }
}
```

**Why bad:** Easy to accidentally call without uid

### ✅ Do: Separate actions
```typescript
// User action (always requires uid)
export async function getUserOrders(uid: string) {
  return supabaseServer.from('orders').eq('firebase_uid', uid)
}

// Admin action (no uid, unrestricted)
export async function adminListAllOrders() {
  await requireAdmin()
  return supabaseAdmin.from('orders').select('*')
}
```

---

### ❌ Don't: Import admin client in shared files
```typescript
// src/lib/products/queries.ts (shared)
import { supabaseAdmin } from '@/lib/supabase/admin'  // ❌ Leaks admin access
```

### ✅ Do: Use appropriate client for context
```typescript
// src/lib/products/queries.ts
import { supabaseServer } from '@/lib/supabase/server'  // ✅ Restricted
```

---

### ❌ Don't: Rely on runtime checks alone
```typescript
// BAD: Easy to forget check
export async function deleteProduct(id: string) {
  // Oops, forgot requireAdmin()
  await supabaseAdmin.from('products').delete().eq('id', id)
}
```

### ✅ Do: Use guard wrapper
```typescript
// GOOD: Forced check
export async function adminDeleteProduct(id: string) {
  return withAdminGuard(async () => {
    await supabaseAdmin.from('products').delete().eq('id', id)
  })
}
```

---

## SUMMARY

**Golden Rules:**

1. **Location = Permission**
   - `lib/admin/*` → unrestricted
   - `lib/cart/*`, `lib/orders/*` → user-scoped

2. **Naming = Intent**
   - `admin*` → unrestricted access
   - No prefix + `uid` param → user-scoped

3. **Client = Context**
   - `supabaseAdmin` → admin only
   - `supabaseServer` → user actions (+ RLS later)

4. **Guard = Safety**
   - Every admin action calls `requireAdmin()`
   - Every user action accepts `uid`

**Next Steps:**
1. Organize existing actions into `/admin` vs user folders
2. Rename admin functions with `admin*` prefix
3. Add `withAdminGuard` wrapper
4. (Future) Convert `supabaseServer` to ANON + RLS
