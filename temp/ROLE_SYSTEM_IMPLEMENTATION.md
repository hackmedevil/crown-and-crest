# Minimal Role System Implementation

## Overview

A lightweight, secure role system for admin access control using Supabase and server-side verification.

**Roles:**
- `customer` (default) - Standard user access
- `admin` - Full admin panel access

**Architecture:**
- **Firebase Auth** → Authentication (who are you?)
- **Supabase users table** → Authorization (what can you do?)
- **Server-side only** → No client role checks

---

## 1. DATABASE SCHEMA

### SQL Migration

**File:** `supabase/migrations/20251216_create_users_roles.sql`

```sql
-- Create role enum
CREATE TYPE user_role AS ENUM ('customer', 'admin');

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text UNIQUE NOT NULL,
  email text,
  phone text,
  role user_role NOT NULL DEFAULT 'customer',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
```

### Table Structure

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | uuid | auto | Primary key |
| `firebase_uid` | text | required | Links to Firebase Auth user |
| `email` | text | null | Optional email |
| `phone` | text | null | Optional phone |
| `role` | user_role | 'customer' | User's role |
| `created_at` | timestamp | now() | Account creation |
| `updated_at` | timestamp | now() | Last role change |

**Key Points:**
- `firebase_uid` is unique (one Supabase user per Firebase user)
- `role` defaults to 'customer' (safe default)
- Indexes on `firebase_uid` and `role` for fast queries

---

## 2. SERVER-SIDE HELPERS

### Helper Functions

**File:** `src/lib/admin/auth.ts`

```typescript
export type UserRole = 'customer' | 'admin'

export interface UserWithRole {
  uid: string
  role: UserRole
}

// Get current user's role
export async function getUserRole(): Promise<UserRole | null>

// Check if current user is admin
export async function isAdmin(): Promise<boolean>

// Throw error if not admin
export async function requireAdmin(): Promise<void>

// Get admin user with role (for layouts)
export async function getAdminUser(): Promise<UserWithRole | null>
```

### Implementation Details

**How it works:**
1. Extract uid from session cookie (via `getCurrentUser()`)
2. Query Supabase `users` table by `firebase_uid`
3. Return role or null

**Performance:**
- Single indexed query per request
- Layout-level check protects all child pages
- No N+1 queries in admin pages

**Security:**
- Server-only (no client imports)
- Uses `supabaseAdmin` client (SERVICE_ROLE)
- Returns 404 for non-admins (hides admin routes)

---

## 3. USAGE EXAMPLES

### Example 1: Admin Layout (Primary Protection)

**File:** `src/app/admin/layout.tsx`

```typescript
import { notFound } from 'next/navigation'
import { getAdminUser } from '@/lib/admin/auth'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Single role check protects all admin pages
  const adminUser = await getAdminUser()
  
  if (!adminUser) {
    notFound() // Returns 404 for non-admins
  }

  return (
    <div className="admin-layout">
      <AdminNav />
      <main>{children}</main>
    </div>
  )
}
```

**Why here?**
- Runs once per navigation (efficient)
- Protects all `/admin/*` routes automatically
- Non-admins see 404 (security through obscurity)

**Flow:**
```
GET /admin/products
  ↓
Admin Layout
  ↓
getAdminUser()
  ↓
role !== 'admin' ? → notFound() (404)
role === 'admin' ? → Render page
```

---

### Example 2: Admin Page (Optional Additional Check)

**File:** `src/app/admin/users/page.tsx`

```typescript
import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export default async function AdminUsersPage() {
  // Optional: Explicit check if not using layout protection
  // (Not needed if layout already checks, but safe)
  await requireAdmin()

  // Fetch all users (admin-only access)
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1>User Management</h1>
      <UserTable users={users} />
    </div>
  )
}
```

**When to use `requireAdmin()` in pages:**
- Layout doesn't enforce admin role (edge case)
- Feature-specific permissions needed (future)
- Extra logging/auditing required

**When NOT needed:**
- Admin layout already calls `getAdminUser()` (most cases)

---

### Example 3: Admin Server Action

**File:** `src/lib/admin/actions/users.ts`

```typescript
'use server'

import { requireAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Promote user to admin role
 * 
 * Admin-only action - must be called from admin UI
 */
export async function adminPromoteUser(firebaseUid: string) {
  // CRITICAL: Always guard admin actions
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role: 'admin' })
    .eq('firebase_uid', firebaseUid)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to promote user: ${error.message}`)
  }

  return { success: true, user: data }
}

/**
 * Demote admin to customer role
 */
export async function adminDemoteUser(firebaseUid: string) {
  await requireAdmin() // Always guard

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role: 'customer' })
    .eq('firebase_uid', firebaseUid)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to demote user: ${error.message}`)
  }

  return { success: true, user: data }
}

/**
 * List all admin users
 */
export async function adminListAdmins() {
  await requireAdmin()

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('role', 'admin')

  if (error) {
    throw new Error(`Failed to fetch admins: ${error.message}`)
  }

  return data
}
```

**Action Pattern:**
1. Call `requireAdmin()` first (throws if not admin)
2. Perform admin-only database operation
3. Return result or throw error

**Why `requireAdmin()` in actions:**
- Actions can be called from anywhere (including client)
- Layout protection doesn't apply to server actions
- Explicit guard makes intent clear

---

### Example 4: Conditional Logic Based on Role

**File:** `src/app/account/profile/page.tsx` (User-facing)

```typescript
import { getCurrentUser } from '@/lib/auth'
import { getUserRole } from '@/lib/admin/auth'
import { redirect } from 'next/navigation'

export default async function UserProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')

  // Check role for conditional UI
  const role = await getUserRole()

  return (
    <div>
      <h1>My Profile</h1>
      <p>UID: {user.uid}</p>
      <p>Role: {role}</p>

      {/* Show admin link if user is admin */}
      {role === 'admin' && (
        <a href="/admin" className="admin-link">
          Go to Admin Panel →
        </a>
      )}

      <UserProfileForm />
    </div>
  )
}
```

**When to use `getUserRole()` in user routes:**
- Conditional UI (show/hide admin links)
- Feature gates (beta features for admins)
- Logging/analytics (track admin vs customer behavior)

**⚠️ WARNING:** This is NOT for security, only UX. Always enforce permissions server-side.

---

## 4. SECURITY NOTES

### ✅ DO

**Server-Side Checks:**
- ✅ Call `getAdminUser()` in admin layout
- ✅ Call `requireAdmin()` in all admin server actions
- ✅ Query role from database (never trust client)

**Isolation:**
- ✅ Keep admin code in `src/lib/admin/*`
- ✅ Keep admin routes in `src/app/admin/*`
- ✅ Use `supabaseAdmin` in admin code only

**User Experience:**
- ✅ Return 404 for non-admins (not 403)
- ✅ Show admin links conditionally (UX only)

---

### ❌ DON'T

**Client-Side Checks:**
- ❌ Don't check role in client components (`'use client'`)
- ❌ Don't pass role in URL params or localStorage
- ❌ Don't cache role indefinitely (user may be demoted)

**Middleware:**
- ❌ Don't check role in middleware (requires DB query, too slow)
- ✅ Only check session cookie in middleware (fast)

**Mixed Logic:**
- ❌ Don't mix admin and user logic in same actions
- ❌ Don't import admin helpers in user routes (creates coupling)

**Security Through Obscurity:**
- ❌ Don't show 403 errors (reveals admin routes exist)
- ✅ Show 404 errors (hides admin routes from non-admins)

---

## 5. ADMIN PROMOTION WORKFLOW

### Initial Setup (First Admin)

**Step 1:** User signs up via Firebase Auth (becomes customer by default)

**Step 2:** Promote to admin via SQL (one-time setup)

```sql
-- Insert or update user to admin role
INSERT INTO users (firebase_uid, role) 
VALUES ('firebase_uid_here', 'admin')
ON CONFLICT (firebase_uid) 
DO UPDATE SET role = 'admin';
```

**Step 3:** User can now access `/admin`

---

### Subsequent Admins (Via Admin UI)

**From Admin Panel:**

1. Admin navigates to `/admin/users`
2. Finds user to promote
3. Clicks "Promote to Admin"
4. Calls `adminPromoteUser(firebaseUid)` server action
5. User now has admin access

**From Code:**

```typescript
// src/app/admin/users/[userId]/page.tsx
import { adminPromoteUser } from '@/lib/admin/actions/users'

async function handlePromote(firebaseUid: string) {
  'use server'
  await adminPromoteUser(firebaseUid)
  revalidatePath('/admin/users')
}
```

---

### Demotion (Removing Admin Access)

```sql
-- Via SQL
UPDATE users SET role = 'customer' 
WHERE firebase_uid = 'firebase_uid_here';
```

**Or via Admin UI:**

```typescript
await adminDemoteUser(firebaseUid)
```

---

## 6. ROLE CHECK FLOW DIAGRAM

```
┌─────────────────────────────────────────────┐
│ User requests /admin/products               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Middleware    │
         │  (Edge)        │
         └────────┬───────┘
                  │
           ┌──────▼──────┐
           │ Session     │
           │ cookie      │
           │ exists?     │
           └─┬─────────┬─┘
             │         │
          NO │         │ YES
             │         │
             ▼         ▼
      ┌───────────┐  ┌────────────────┐
      │ Redirect  │  │ Continue       │
      │ to login  │  │ to page        │
      └───────────┘  └────────┬───────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Admin Layout    │
                     │ (Server)        │
                     └────────┬────────┘
                              │
                       ┌──────▼───────┐
                       │ Query DB for │
                       │ user role    │
                       └──────┬───────┘
                              │
                       ┌──────▼──────┐
                       │ role ===    │
                       │ 'admin'?    │
                       └─┬─────────┬─┘
                         │         │
                      NO │         │ YES
                         │         │
                         ▼         ▼
                  ┌───────────┐  ┌────────────┐
                  │ notFound()│  │ Render     │
                  │ (404)     │  │ admin page │
                  └───────────┘  └────────────┘
```

**Key Points:**
- Middleware checks session (fast, edge)
- Layout checks role (secure, database)
- Non-admins never see admin UI (404)

---

## 7. TESTING CHECKLIST

### Before Going Live

**Database:**
- [ ] Users table created with `role` column
- [ ] Indexes on `firebase_uid` and `role` exist
- [ ] Default role is `'customer'`

**Admin Helpers:**
- [ ] `getUserRole()` returns correct role
- [ ] `isAdmin()` returns true for admins, false for customers
- [ ] `requireAdmin()` throws for non-admins
- [ ] `getAdminUser()` returns null for non-admins

**Admin Layout:**
- [ ] Admin layout calls `getAdminUser()`
- [ ] Non-admins see 404 (not 403)
- [ ] Admins see admin navigation

**Admin Actions:**
- [ ] All admin actions call `requireAdmin()`
- [ ] Non-admins get "Unauthorized" error
- [ ] Admin actions use `supabaseAdmin` client

**Middleware:**
- [ ] Middleware checks session cookie for `/admin/*`
- [ ] Middleware does NOT check role (no DB query)

---

## 8. FUTURE ENHANCEMENTS (Out of Scope)

**Granular Permissions:**
```typescript
type Permission = 
  | 'products:read'
  | 'products:write'
  | 'orders:read'
  | 'orders:write'
  | 'users:manage'

// permissions table
// role_permissions junction table
```

**Role Hierarchy:**
```typescript
type UserRole = 
  | 'customer'
  | 'editor'      // Can edit products
  | 'manager'     // Can manage orders
  | 'admin'       // Full access
```

**Audit Logging:**
```typescript
await logAdminAction({
  adminUid: user.uid,
  action: 'promote_user',
  targetUid: targetUser.uid,
  timestamp: new Date()
})
```

---

## SUMMARY

### What Was Implemented

1. **Database Schema**
   - `users` table with `role` column
   - Enum: `'customer'` (default), `'admin'`
   - Indexed for fast lookups

2. **Server Helpers**
   - `getUserRole()` - fetch current user's role
   - `isAdmin()` - boolean check
   - `requireAdmin()` - throw if not admin
   - `getAdminUser()` - get admin user for layouts

3. **Usage Patterns**
   - Admin layout: `getAdminUser()` → `notFound()` if not admin
   - Admin pages: Optional `requireAdmin()` for explicit checks
   - Admin actions: Always `requireAdmin()` before operations
   - User routes: Optional `getUserRole()` for conditional UI

### Security Model

- **Authentication:** Firebase (session cookie with uid)
- **Authorization:** Supabase (role in users table)
- **Enforcement:** Server-side only (layouts + actions)
- **Obscurity:** 404 for non-admins (not 403)

**System is minimal, secure, and ready for production.**
