# AI SAFETY MANIFEST

**Repository**: Crown & Crest E-Commerce  
**Purpose**: Protect system integrity during AI-assisted development  
**Status**: ENFORCED  
**Last Updated**: January 31, 2026

---

## ABSOLUTE PROHIBITIONS

The following actions are **NEVER** permitted without explicit human approval:

❌ **NO** production database destructive operations (`DROP`, `DELETE`, `TRUNCATE`)  
❌ **NO** environment variable changes (`.env`, `.env.local`, `.env.production`)  
❌ **NO** RLS policy modifications after initial enablement  
❌ **NO** payment gateway configuration changes (Razorpay keys, webhook URLs)  
❌ **NO** cron job schedule modifications (`vercel.json`)  
❌ **NO** authentication provider changes (Firebase config)  
❌ **NO** session management algorithm changes (cookie signing, expiry)  
❌ **NO** inventory RPC logic modifications (`reserve_stock`, `commit_reservation`, `release_reservation`)  
❌ **NO** removal of security guards (`getCurrentUser`, `requireAdmin`)

**Violation Consequence**: Immediate rollback + human review required.

---

## RED ZONE FILES

**Manual approval required for ANY changes**:

### Authentication & Authorization
- `src/lib/auth.ts` - Session management
- `src/lib/admin/auth.ts` - Admin role checks
- `src/lib/firebase/admin.ts` - Firebase admin SDK
- `src/lib/firebase/client.ts` - Firebase client SDK

### Payment Processing
- `src/app/api/razorpay/**/*` - All Razorpay endpoints
- `src/lib/razorpay.ts` - Payment gateway client
- `src/app/api/shiprocket/**/*` - Shipping integration

### Inventory Management
- `supabase/migrations/*stock*` - Stock reservation RPCs
- `supabase/migrations/*rls*` - Row Level Security policies
- `src/lib/inventory/actions.ts` - Stock mutation actions

### System Configuration
- `vercel.json` - Deployment & cron configuration
- `.env*` - Environment variables
- `next.config.ts` - Build configuration (image domains, headers)
- `tsconfig.json` - TypeScript configuration

### Critical Business Logic
- `src/lib/cart/actions.ts` - Cart mutations (requires auth review)
- `src/lib/checkout/actions.ts` - Checkout flow
- `src/lib/orders/actions.ts` - Order creation

---

## YELLOW ZONE FILES

**AI allowed WITH mandatory human code review before deployment**:

### Cart & Checkout
- Refactors to cart logic (must preserve auth checks)
- Checkout UX improvements (must preserve inventory flow)
- Address validation logic

### Inventory (Read-Only)
- Availability queries
- Stock display logic
- Reservation status checks

### Auth UX (NOT Auth Logic)
- Login page UI improvements
- OTP page UX fixes
- Error message improvements
- Loading states

### Performance Optimizations
- Caching headers on API routes
- Database query optimizations (read-only)
- Image optimization settings
- Component code splitting

---

## GREEN ZONE FILES

**AI fully permitted (no pre-approval needed)**:

### UI Components
- `src/components/ui/**/*` - Reusable UI library
  - **RULE**: Must follow `DESIGN_SYSTEM.md`
  - **RULE**: No arbitrary Tailwind values
  - **RULE**: Must have TypeScript types

### Type Definitions
- `src/types/**/*` - TypeScript interfaces
  - **RULE**: Must match database schema
  - **RULE**: Export interfaces (not types for complex objects)

### Non-Critical Server Actions
- New CRUD actions (non-payment, non-auth)
  - **RULE**: Must call `getCurrentUser()` or `requireAdmin()` first
  - **RULE**: Must validate inputs
  - **RULE**: Must use try-catch with error returns
  - **RULE**: Must return `{ success: bool, data?, error?: string }`

### Non-Critical API Routes
- Public data endpoints (product listings, categories)
  - **RULE**: Must validate inputs
  - **RULE**: Must return consistent JSON format

### Design System Compliance
- Replacing arbitrary Tailwind values with design tokens
- Fixing spacing/color violations
  - **RULE**: Must reference `DESIGN_SYSTEM.md`
  - **RULE**: Must not change visual appearance significantly

### Documentation
- README updates
- Feature guides (e.g., `SIZEBOOK_GUIDE.md`)
- API documentation
- Architecture diagrams

---

## MANDATORY CODING RULES

**All AI-generated code MUST comply**:

### 1. Authentication & Authorization
```typescript
// ✅ REQUIRED: Every server action must authenticate
export async function myAction() {
  'use server'
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  // ... rest of logic
}

// ✅ REQUIRED: Admin actions must check role
export async function adminAction() {
  'use server'
  const { user, isAdmin } = await requireAdmin()
  if (!isAdmin) return { success: false, error: 'Forbidden' }
  // ... rest of logic
}
```

### 2. Database Operations
```typescript
// ✅ REQUIRED: Stock updates via RPCs only
await supabase.rpc('reserve_stock', { order_id, items, ttl })

// ❌ FORBIDDEN: Direct stock updates
await supabase.from('variants').update({ stock_quantity: ... })
```

### 3. Error Handling
```typescript
// ✅ REQUIRED: Consistent error return format
try {
  const result = await operation()
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
}
```

### 4. Type Safety
```typescript
// ✅ REQUIRED: No 'any' types
function process(data: unknown) {
  if (!isValidData(data)) throw new Error('Invalid')
  // Type narrowed, safe to use
}

// ❌ FORBIDDEN: any parameters
function process(data: any) { ... }
```

### 5. Design System Compliance
```tsx
// ✅ ALLOWED: Design token classes
<div className="p-6 mt-8 bg-neutral-50 text-brand-black">

// ❌ FORBIDDEN: Arbitrary values
<div className="p-[13px] mt-[25px] bg-blue-500">
```

### 6. Security Headers
```typescript
// ✅ REQUIRED: Secure cookies
cookies().set('name', value, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 604800 // 7 days
})
```

---

## PRE-DEPLOYMENT CHECKLIST

**Before ANY deployment, verify**:

- [ ] `npm run build` succeeds with 0 errors
- [ ] No `console.log()` in production code paths
- [ ] All env vars set (no fallback secrets used)
- [ ] TypeScript strict mode passes
- [ ] No `any` types added
- [ ] Design system compliance (no arbitrary values)
- [ ] Authentication guards present on all mutations
- [ ] Error handling follows standard pattern

**Manual Testing Required**:
- [ ] Create account → Add to cart → Checkout → Verify order in admin
- [ ] Attempt to buy out-of-stock item → Must show error
- [ ] Login as non-admin → Must not access `/admin`
- [ ] Test payment in Razorpay test mode

---

## AGENT ROLE DEFINITIONS

**DO NOT MIX RESPONSIBILITIES**:

| Agent | Allowed Tasks | Prohibited Tasks |
|-------|--------------|------------------|
| **Antigravity** | Audits, reports, risk detection, documentation | Code implementation |
| **OpenClaw** | GREEN ZONE implementation, type definitions | RED ZONE files, payments |
| **Claude/Gemini** | Design reasoning, refactors, architecture guidance | Direct code execution |
| **Human** | Final approval, RED ZONE changes, production deployment | Routine GREEN ZONE tasks |

---

## ENFORCEMENT MECHANISM

**Violation Detection**:
1. Code review checklist (manual)
2. ESLint rules (to be added for design system)
3. TypeScript strict mode (enforced)
4. Pre-commit hooks (future)

**Violation Response**:
1. **Minor** (design system violation) → Fix in next PR
2. **Major** (missing auth guard) → Block merge, require fix
3. **Critical** (payment logic change without approval) → Immediate rollback + incident review

---

## SAFE AUTOMATION WORKFLOW

**Phase 0**: Safety manifest created ✅ (this file)  
**Phase 1**: Fix 3 critical blockers (SESSION_SECRET, RLS, rate limiting)  
**Phase 2**: Enable GREEN ZONE automation (UI, types, docs)  
**Phase 3**: Enable YELLOW ZONE with review (cart, checkout, performance)  
**Phase 4**: RED ZONE remains human-only indefinitely

---

**Questions or Exceptions**: Consult human before proceeding.

**Last Review**: January 31, 2026  
**Next Review**: After Phase 1 completion
