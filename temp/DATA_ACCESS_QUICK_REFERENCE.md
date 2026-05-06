# Data Access Pattern - Quick Reference

**Status:** ✅ Finalized for Production

This document provides a concise reference for data access patterns in the Crown and Crest project. For detailed explanations, see [ADMIN_DATA_ACCESS_PATTERN.md](./ADMIN_DATA_ACCESS_PATTERN.md).

---

## CLIENT USAGE RULES

### supabaseAdmin (SERVICE_ROLE)
**Location:** `src/lib/supabase/admin.ts`

**Use ONLY in:**
- ✅ `src/lib/admin/actions/*.ts` - Admin server actions
- ✅ `src/app/api/admin/*` - Admin API routes
- ✅ `src/lib/admin/auth.ts` - Role verification
- ✅ System operations (payment verification, order creation)

**NEVER use in:**
- ❌ User routes or actions (`lib/cart/*`, `lib/orders/*`)
- ❌ Shared utilities
- ❌ Client components
- ❌ Public queries

**Why:** Bypasses RLS, unrestricted access to all data

---

### supabaseServer (Currently SERVICE_ROLE, migrate to ANON)
**Location:** `src/lib/supabase/server.ts`

**Use in:**
- ✅ User server actions (`lib/cart/actions.ts`, `lib/orders/actions.ts`)
- ✅ User page server components
- ✅ Public read-only queries

**Pattern:**
```typescript
// ALWAYS filter by user
const { data } = await supabaseServer
  .from('cart_items')
  .select('*')
  .eq('firebase_uid', uid)  // ← Required
```

**Migration Note:** Will be converted to ANON key + RLS policies in Phase 2

---

### supabaseClient (Future)
**Location:** `src/lib/supabase/client.ts` (not yet created)

**Use in:**
- ✅ Client components (`'use client'`)
- ✅ Browser-side queries (rare)

**Will use:** ANON key + RLS policies

---

## FILE ORGANIZATION

```
src/lib/
├── admin/                    ← ADMIN ONLY
│   ├── actions/
│   │   ├── _base.ts         ← withAdminGuard() wrapper
│   │   ├── products.ts      ← Admin product CRUD
│   │   ├── orders.ts        ← Admin order management
│   │   ├── users.ts         ← User/role management
│   │   └── analytics.ts     ← Stats/reports
│   ├── auth.ts              ← Role verification
│   └── types.ts             ← Admin types
│
├── cart/
│   └── actions.ts           ← User cart (requires uid)
│
├── orders/
│   └── actions.ts           ← User orders (requires uid)
│
├── products/
│   └── queries.ts           ← Public product queries
│
├── auth.ts                  ← getCurrentUser()
├── razorpay.ts              ← Payment utils
│
└── supabase/
    ├── admin.ts             ← SERVICE_ROLE
    ├── server.ts            ← User-scoped (future ANON)
    └── client.ts            ← Browser (future)
```

---

## NAMING CONVENTIONS

### Admin Actions
**Pattern:** `admin<Verb><Noun>`

```typescript
// src/lib/admin/actions/products.ts
export async function adminCreateProduct(data: ProductInput)
export async function adminUpdateProduct(id: string, data: Partial<ProductInput>)
export async function adminDeleteProduct(id: string)
export async function adminListAllProducts()        // No user filter
export async function adminGetOrderById(id: string) // No uid needed
```

**Signals:**
- Prefix `admin*` → unrestricted access
- Suffix `All` → queries all users' data
- No `uid` parameter → admin-only

---

### User Actions
**Pattern:** `<verb><Noun>` (always requires `uid`)

```typescript
// src/lib/cart/actions.ts
export async function getCart(uid: string)
export async function addToCart(uid: string, productId: string, quantity: number)
export async function removeFromCart(uid: string, itemId: string)

// src/lib/orders/actions.ts
export async function getUserOrders(uid: string)
export async function createOrder(uid: string, orderData: OrderInput)
```

**Signals:**
- No `admin` prefix
- First parameter is `uid: string`
- Filters by `firebase_uid` in query

---

### Public Queries
**Pattern:** `get<Noun>` or `list<Noun>` (no auth required)

```typescript
// src/lib/products/queries.ts
export async function getProductBySlug(slug: string)
export async function listProducts(filters?: ProductFilters)
export async function searchProducts(query: string)
```

**Signals:**
- Read-only
- No `uid` parameter
- No authentication check
- Safe to call from anywhere

---

## DEVELOPMENT CHECKLIST

### Before Writing New Code

**Admin Feature:**
- [ ] Create file in `src/lib/admin/actions/`
- [ ] Import `supabaseAdmin` from `@/lib/supabase/admin`
- [ ] Import `requireAdmin` from `@/lib/admin/auth`
- [ ] Prefix all functions with `admin*`
- [ ] Call `requireAdmin()` at start of each function
- [ ] No `uid` parameters (unrestricted access)

**User Feature:**
- [ ] Create file in `src/lib/<feature>/actions.ts`
- [ ] Import `supabaseServer` from `@/lib/supabase/server`
- [ ] All functions accept `uid: string` as first parameter
- [ ] All queries filter by `.eq('firebase_uid', uid)`
- [ ] NO import of admin client or actions

**Public Query:**
- [ ] Create file in `src/lib/<feature>/queries.ts`
- [ ] Import `supabaseServer`
- [ ] Read-only (SELECT only)
- [ ] No authentication check
- [ ] Pagination for large datasets

---

### Code Review Checklist

**Admin Code:**
- [ ] Only in `src/lib/admin/*` folder
- [ ] Uses `supabaseAdmin` client
- [ ] Every function calls `requireAdmin()` or uses `withAdminGuard()`
- [ ] Function names start with `admin*`
- [ ] No user pages import admin actions

**User Code:**
- [ ] Not in `src/lib/admin/*` folder
- [ ] Uses `supabaseServer` client
- [ ] All functions require `uid` parameter
- [ ] All queries filter by `firebase_uid`
- [ ] Does NOT import from `@/lib/supabase/admin`

**Shared Code:**
- [ ] Read-only operations
- [ ] No admin client imports
- [ ] No sensitive data exposed
- [ ] Uses pagination

---

## SECURITY RULES

### ✅ DO

1. **Admin code isolation**
   - Keep admin actions in `lib/admin/actions/*`
   - Use `supabaseAdmin` only in admin code
   - Call `requireAdmin()` in every admin action

2. **User data scoping**
   - Always accept `uid` parameter in user actions
   - Always filter by `firebase_uid` in queries
   - Never trust client-provided data

3. **Guard patterns**
   ```typescript
   // Admin action
   export async function adminDeleteUser(userId: string) {
     await requireAdmin()
     // ... admin logic
   }
   
   // User action
   export async function getUserProfile(uid: string) {
     const { data } = await supabaseServer
       .from('users')
       .select('*')
       .eq('firebase_uid', uid)
       .single()
     return data
   }
   ```

---

### ❌ DON'T

1. **Mixed contexts**
   ```typescript
   // ❌ BAD: Don't mix admin and user logic
   export async function getOrders(uid?: string) {
     if (uid) {
       return supabaseServer.from('orders').eq('firebase_uid', uid)
     } else {
       return supabaseAdmin.from('orders').select('*')
     }
   }
   ```

2. **Admin imports in user code**
   ```typescript
   // ❌ BAD: User action importing admin client
   // src/lib/cart/actions.ts
   import { supabaseAdmin } from '@/lib/supabase/admin'
   ```

3. **Missing guards**
   ```typescript
   // ❌ BAD: Admin action without guard
   export async function adminDeleteProduct(id: string) {
     // Missing: await requireAdmin()
     await supabaseAdmin.from('products').delete().eq('id', id)
   }
   ```

4. **Unscoped queries**
   ```typescript
   // ❌ BAD: User action without uid filter
   export async function getCart() {
     return supabaseServer.from('cart_items').select('*')
     // Returns ALL users' carts!
   }
   ```

---

## ACCESS MATRIX

| Context | Client | Location | Scope | Guard Required |
|---------|--------|----------|-------|----------------|
| Admin Actions | `supabaseAdmin` | `lib/admin/actions/*` | Unrestricted | `requireAdmin()` |
| Admin Auth | `supabaseAdmin` | `lib/admin/auth.ts` | Role check | N/A |
| User Actions | `supabaseServer` | `lib/cart/*`, `lib/orders/*` | User-scoped | `uid` param |
| Public Queries | `supabaseServer` | `lib/products/*` | Read-only | None |
| Client Components | `supabaseClient` | `components/*` (future) | RLS-enforced | None |

---

## COMMON PATTERNS

### 1. Admin Action with Guard Wrapper

```typescript
// src/lib/admin/actions/_base.ts
export async function withAdminGuard<T>(
  fn: () => Promise<T>
): Promise<T> {
  await requireAdmin()
  return fn()
}

// src/lib/admin/actions/products.ts
export async function adminCreateProduct(data: ProductInput) {
  return withAdminGuard(async () => {
    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert(data)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return product
  })
}
```

---

### 2. User Action with Scoping

```typescript
// src/lib/cart/actions.ts
export async function getCart(uid: string) {
  const { data, error } = await supabaseServer
    .from('cart_items')
    .select(`
      *,
      products (
        id,
        name,
        price,
        images
      )
    `)
    .eq('firebase_uid', uid)  // ← Always scope by user
  
  if (error) throw new Error(error.message)
  return data
}

export async function addToCart(
  uid: string,
  productId: string,
  quantity: number
) {
  const { data, error } = await supabaseServer
    .from('cart_items')
    .insert({
      firebase_uid: uid,  // ← Always include user context
      product_id: productId,
      quantity
    })
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  return data
}
```

---

### 3. Public Query (No Auth)

```typescript
// src/lib/products/queries.ts
export async function getProductBySlug(slug: string) {
  const { data, error } = await supabaseServer
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)  // Only show published products
    .single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function listProducts(filters?: {
  category?: string
  minPrice?: number
  maxPrice?: number
  limit?: number
}) {
  let query = supabaseServer
    .from('products')
    .select('*')
    .eq('published', true)
  
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  
  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice)
  }
  
  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice)
  }
  
  // Always paginate
  query = query.limit(filters?.limit || 20)
  
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}
```

---

## MIGRATION ROADMAP

### Phase 1: Current State ✅
- [x] Admin uses `supabaseAdmin` (SERVICE_ROLE)
- [x] User uses `supabaseServer` (SERVICE_ROLE, but scoped by uid)
- [x] Role system implemented

### Phase 2: Enable RLS (Future)
- [ ] Convert `supabaseServer` to use ANON key
- [ ] Enable RLS on user tables (cart_items, orders, users)
- [ ] Create RLS policies for user data
- [ ] Test user actions with RLS enabled

### Phase 3: Browser Client (Future)
- [ ] Create `supabaseClient` with ANON key
- [ ] Use in client components for real-time features
- [ ] Rely on RLS for security

---

## QUICK DECISION TREE

**Q: Where should I put this code?**

```
Is this admin-only? (manage all users' data)
├─ YES → src/lib/admin/actions/<feature>.ts
│         Use: supabaseAdmin
│         Guard: requireAdmin()
│         Name: admin<Verb><Noun>
│
└─ NO → Is it user-specific? (user's own data)
    ├─ YES → src/lib/<feature>/actions.ts
    │         Use: supabaseServer
    │         Param: uid: string
    │         Filter: .eq('firebase_uid', uid)
    │
    └─ NO → Is it public? (product catalog, etc.)
              src/lib/<feature>/queries.ts
              Use: supabaseServer
              Guard: None
              Filter: .eq('published', true)
```

---

## EMERGENCY CHECKLIST

**If you see this error:**
```
Error: RLS policy violation / Permission denied
```

**Check:**
1. Are you using `supabaseServer` in admin code? → Use `supabaseAdmin`
2. Did you forget to filter by `firebase_uid`? → Add `.eq('firebase_uid', uid)`
3. Are you querying from a client component? → Move to server action

---

**If admin can't access data:**
```
Error: Unauthorized
```

**Check:**
1. Did you call `requireAdmin()` in the action?
2. Does the user have `role = 'admin'` in the database?
3. Is `getAdminUser()` called in the layout?

---

**If users see other users' data:**
```
User A can see User B's cart
```

**Check:**
1. Are you using `supabaseAdmin` in user code? → Use `supabaseServer`
2. Did you forget `.eq('firebase_uid', uid)`? → Add filter
3. Is RLS enabled? → If not, rely on manual filtering (current state)

---

## SUMMARY

**Golden Rules:**
1. **Location = Permission** - Admin code in `lib/admin/*`, user code elsewhere
2. **Naming = Intent** - `admin*` prefix for unrestricted, `uid` param for scoped
3. **Client = Context** - `supabaseAdmin` for admin, `supabaseServer` for users
4. **Guard = Safety** - Always `requireAdmin()` in admin actions, always `uid` in user actions

**Next Steps:**
1. ✅ Review this document before writing new code
2. ✅ Use checklist for code reviews
3. ✅ Follow naming conventions strictly
4. ⏳ Plan RLS migration (Phase 2)

**For detailed explanations:** See [ADMIN_DATA_ACCESS_PATTERN.md](./ADMIN_DATA_ACCESS_PATTERN.md)

**Status:** Ready for production ✅
