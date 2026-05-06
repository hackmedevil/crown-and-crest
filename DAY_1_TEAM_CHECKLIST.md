# Day 1 Foundations – Team Execution Checklist

**Status:** ✅ ALL SCAFFOLDING COMPLETE  
**Date:** March 9, 2026  
**Next Step:** Begin implementation (estimated 7–12 hours for the team)

---

## 🎯 What Was Done (Automated Setup Complete)

| Task | Status | File(s) |
|------|--------|---------|
| TypeScript strict mode enabled | ✅ | `tsconfig.json` |
| GA4 wrapper created | ✅ | `src/lib/gtag.ts` |
| GA4 page-view tracker created | ✅ | `src/components/GA4Tracker.tsx` |
| Layout updated with GA4 script | ✅ | `src/app/layout.tsx` |
| Centralized logger created | ✅ | `src/lib/logger.ts` |
| Sentry server config created | ✅ | `sentry.server.config.js` |
| Sentry client config created | ✅ | `sentry.client.config.js` |
| Environment documentation created | ✅ | `.env.example` |
| Implementation guide written | ✅ | `DAY_1_IMPLEMENTATION_GUIDE.md` |
| Setup validation script created | ✅ | `scripts/setup-day-1.ps1` + `setup-day-1.sh` |
| Summary document created | ✅ | `DAY_1_SUMMARY.md` |

**Validation Result:** ✅ SUCCESS - All files present and configured

---

## 📋 Team Tasks (Pick It Up From Here)

### IMMEDIATE (Next 1–2 hours)

#### Step 1: Set up environment variables (All Team)
```bash
# Copy the template to your local machine
cp .env.example .env.local

# Edit .env.local and fill in:
# 1. GA4 ID (get from Google Analytics 4 → Admin → Property → Data Streams)
# 2. Sentry DSN (optional for now – get from https://sentry.io/)
```

**Where to get GA4 ID:**
1. Go to [Google Analytics 4](https://analytics.google.com/)
2. Find your property → Admin → Data Streams → Web
3. Copy the "Measurement ID" (format: `G-XXXXXXXXXX`)
4. Paste it in `.env.local` as `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`

#### Step 2: Create a feature branch (All Team)
```bash
git checkout -b feat/day-1-foundations
```

### Phase A: TypeScript Strict Mode (Backend/Full-Stack – 2–4 hours)

#### Step 1: Run the type-checker
```bash
npx tsc --noEmit
```

You'll see a list of errors like:
```
src/lib/api.ts:45:14 - error TS2322: Type 'any' is not assignable to type 'Product'.
src/components/Cart.tsx:12:20 - error TS7031: Binding element 'items' implicitly has an 'any' type.
```

#### Step 2: Fix errors using the reference guide
See [`DAY_1_IMPLEMENTATION_GUIDE.md`](./DAY_1_IMPLEMENTATION_GUIDE.md) → Pillar A section for a table of common errors and fixes.

**Quick workflow:**
1. Open the first error file
2. Look up the error type in the reference table
3. Apply the fix (usually: replace `any` → proper type, add type annotation, remove unused variable)
4. Re-run `npx tsc --noEmit` to check progress
5. Repeat until 0 errors

#### Step 3: Commit the fixes
```bash
git add tsconfig.json src/**/*.ts src/**/*.tsx
git commit -m "chore: fix TypeScript strict mode violations"
git push
```

### Phase B: GA4 Analytics Integration (Frontend – 2–3 hours)

#### Step 1: Identify key tracking points
Review these components and add GA4 event tracking:

| Component | Event | Code Location |
|-----------|-------|----------------|
| Product Detail Page | `view_item` | `src/app/products/[id]/page.tsx` |
| Add to Cart Button | `add_to_cart` | Cart utility / API route |
| Checkout Page Start | `begin_checkout` | `src/app/checkout/page.tsx` |
| Payment Success | `purchase` | Payment webhook / success handler |

#### Step 2: Add event tracking in each component
Example for Product Detail Page:
```tsx
import { trackProductView } from '@/lib/gtag';

export default function ProductPage({ product }) {
  useEffect(() => {
    trackProductView({
      id: product.id,
      name: product.name,
      price: product.base_price,
      category: product.category?.name,
    });
  }, [product]);
  // ... rest of component
}
```

See [`DAY_1_IMPLEMENTATION_GUIDE.md`](./DAY_1_IMPLEMENTATION_GUIDE.md) → Pillar B section for 6 detailed examples.

#### Step 3: Test locally
```bash
npm run dev
# Open http://localhost:3000 in browser
# Open DevTools → Console → Network
# Navigate pages and watch for Google Analytics requests
```

#### Step 4: Commit GA4 changes
```bash
git add src/lib/gtag.ts src/**/*.tsx src/**/*.ts
git commit -m "feat: add GA4 ecommerce event tracking"
git push
```

### Phase C: Sentry Error Logging (Backend – 1–2 hours)

#### Step 1: Install Sentry SDK
```bash
npm install @sentry/nextjs
```

#### Step 2: Replace `console.error` calls with `logger.error`
Find high-risk error handlers:
```bash
grep -r "console.error" src/ --include="*.ts" --include="*.tsx"
```

Then replace like this:
```tsx
// BEFORE
catch (error) {
  console.error("Payment failed:", error);
}

// AFTER
import { logger } from '@/lib/logger';
catch (error) {
  logger.error("Payment failed", error as Error, { orderId: order.id });
}
```

#### Step 3: Test Sentry locally
1. Start dev server: `npm run dev`
2. Open browser console and run:
   ```javascript
   throw new Error("Test Sentry error");
   ```
3. Check Sentry dashboard if you've set up a project

#### Step 4: Commit Sentry changes
```bash
git add package.json package-lock.json src/**/*.ts src/**/*.tsx
git commit -m "chore: integrate Sentry error logging"
git push
```

---

## ✅ Completion Checklist

### Phase A – TypeScript
- [ ] Run `npx tsc --noEmit` → **0 errors**
- [ ] All `.ts`/`.tsx` files compile cleanly
- [ ] Commit and push to PR

### Phase B – GA4
- [ ] GA4 ID added to `.env.local`
- [ ] Event tracking added to PDP, cart, checkout
- [ ] Test locally and see events in browser DevTools
- [ ] Commit and push to PR

### Phase C – Sentry
- [ ] Install `@sentry/nextjs` package
- [ ] Replace 5–10 `console.error` calls with `logger.error`
- [ ] Commit and push to PR

### Final
- [ ] Create PR on GitHub
- [ ] Add description and link to [`DAY_1_IMPLEMENTATION_GUIDE.md`](./DAY_1_IMPLEMENTATION_GUIDE.md)
- [ ] Request review from 1–2 team members
- [ ] Merge when CI passes

---

## 🚀 Time Estimates

| Task | Owner | Est. Hours | Notes |
|------|-------|------------|-------|
| **Phase A – TS Strict** | Backend | 2–4 | Depends on # of errors |
| **Phase B – GA4** | Frontend | 2–3 | Minimal, just add calls |
| **Phase C – Sentry** | Backend | 1–2 | Replace error handlers |
| **Testing & PR** | All | 1 | Code review + merge |
| **TOTAL** | — | **6–10** | Fully parallelizable |

---

## 🧪 Testing Checklist Before Merge

### Local Testing
- [ ] `npm run dev` – dev server starts without errors
- [ ] `npx tsc --noEmit` – 0 TypeScript errors
- [ ] Open http://localhost:3000
  - [ ] Page loads without console errors
  - [ ] GA4 events fire on navigation (check DevTools)
- [ ] Navigate to product page
  - [ ] `view_item` event fires (GA4)
- [ ] Add product to cart
  - [ ] `add_to_cart` event fires (GA4)
- [ ] Start checkout
  - [ ] `begin_checkout` event fires (GA4)
- [ ] Test error logging
  - [ ] Throw test error in console
  - [ ] Check Sentry Issues (if DSN configured)

### Code Review
- [ ] No `any` types remain (use `grep -r "any" src/`)
- [ ] No unused variables (TypeScript enforces this)
- [ ] All logger calls use proper context object
- [ ] GA4 events include correct payload fields
- [ ] No sensitive data in error logs (PII stripped by default)

### CI Pipeline
- [ ] GitHub Actions / Vercel build passes
- [ ] Lint errors fixed
- [ ] Test coverage maintained

---

## 📞 Support

**TypeScript questions?**
→ See `DAY_1_IMPLEMENTATION_GUIDE.md` → Pillar A → Reference Guide

**GA4 questions?**
→ See `DAY_1_IMPLEMENTATION_GUIDE.md` → Pillar B → 6 Code Examples

**Sentry questions?**
→ See `DAY_1_IMPLEMENTATION_GUIDE.md` → Pillar C → Using the Logger

**Something broken?**
→ Check troubleshooting section in `DAY_1_IMPLEMENTATION_GUIDE.md`

---

## 📊 Success Metrics

At end of Day 1, the team should have:

| Metric | Target | How to verify |
|--------|--------|---------------|
| **TypeScript compile** | 0 errors | `npx tsc --noEmit` |
| **GA4 events** | ≥3 firing | GA4 Real-time dashboard |
| **Sentry setup** | Connected | Sentry Issues dashboard |
| **Code coverage** | Maintained | CI reports |
| **Performance** | No degradation | Lighthouse score stable |

---

## 🎉 What's Next (Week 2)

Once Day 1 is complete:
- [ ] Razorpay payment integration (real checkout)
- [ ] Account pages (profile, orders, wishlist)
- [ ] E2E tests for checkout flow
- [ ] GA4 dashboard visualization
- [ ] Admin feature: Order management

---

## 📚 Documentation Overview

| Document | Audience | Length | Purpose |
|----------|----------|--------|---------|
| **DAY_1_IMPLEMENTATION_GUIDE.md** | Developers | ~5,000 words | Detailed how-to with code examples |
| **DAY_1_SUMMARY.md** | Project Lead | ~3,000 words | Overview, timeline, success metrics |
| **THIS FILE** | Team | ~2,000 words | Action checklist, step-by-step tasks |

---

## 🚀 Command Quick Reference

```bash
# Validate setup
powershell -ExecutionPolicy Bypass -File "scripts/setup-day-1.ps1"  # Windows
# or
bash scripts/setup-day-1.sh  # Mac/Linux

# Type-check
npx tsc --noEmit

# Check for 'any' types
grep -r "any" src/ --include="*.tsx" | grep -v "anyOf"

# Check for console.error
grep -r "console.error" src/ --include="*.tsx"

# Start dev
npm run dev

# Commit
git add .
git commit -m "feat: Day 1 Foundations - TS strict, GA4, Sentry"
git push
```

---

**Let's build this! 🚀**

When you're done with Day 1, reach out with any blockers or questions. The next phase (checkout + payments) is ready to start.
