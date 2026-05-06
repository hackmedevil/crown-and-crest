# Day 1 Foundations – Implementation Guide

**Date:** March 9, 2026  
**Status:** Ready to Execute

This guide covers the three Day 1 Foundation pillars that have been scaffolded in the codebase.

---

## 📋 Quick Checklist (Before You Start)

- [ ] **Environment Variables Setup**
  - [ ] Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to `.env.local` (get from GA4 dashboard)
  - [ ] Add `SENTRY_DSN` to `.env.local` (optional, for error tracking in staging/production)
  - [ ] Add to Vercel environment variables (for production deployments)

- [ ] **Install Dependencies** (if not already done)
  ```bash
  npm install @sentry/nextjs
  npm install --save-dev @types/gtag.js  # optional, for TypeScript support
  ```

- [ ] **Review Files Created** – Verify these new files exist:
  - [ ] `src/lib/gtag.ts` – GA4 wrapper
  - [ ] `src/lib/logger.ts` – Sentry logger
  - [ ] `src/components/GA4Tracker.tsx` – Page view tracker
  - [ ] `sentry.server.config.js` – Server config
  - [ ] `sentry.client.config.js` – Client config
  - [ ] `.env.example` – Environment variable documentation
  - [ ] `tsconfig.json` updated with strict mode flags

---

## 🎯 Pillar A – TypeScript Strict Mode (✅ COMPLETE)

### What was done:
1. Updated `tsconfig.json` to enable:
   - `strict: true` (sets all strict options)
   - `noImplicitAny: true` – forbid variables without type annotations
   - `strictNullChecks: true` – treat `null`/`undefined` as distinct types
   - `noUnusedLocals: true` – error on unused variables
   - `noUnusedParameters: true` – error on unused function parameters
   - `noImplicitReturns: true` – all code paths must return a value
   - And 7 more strict flags (see `tsconfig.json`)

### What to do next:
1. **Run the type-checker** to find any violations:
   ```bash
   npx tsc --noEmit
   ```

2. **Fix each error** using this reference:
   | Error Type | Fix |
   |-----------|-----|
   | `any` | Replace with proper type from `src/types/` (e.g., `Product`, `Order`) |
   | `Object is possibly 'null'` | Add `if (x) { … }` guard or use optional chaining `x?.property` |
   | `Property does not exist on type` | Add property to the interface |
   | `Function missing return type` | Add explicit return type (e.g., `: Promise<Product[]>`) |
   | `Unused parameter` | Remove it or prefix with `_` (e.g., `_unused`) |

3. **Common quick fixes** (run these grep searches to find trouble spots):
   ```bash
   # Find all 'any' types
   grep -r "any" src/ --include="*.ts" --include="*.tsx" | grep -v "anyOf" | head -20
   
   # Find all console.error (should use logger instead)
   grep -r "console.error" src/ --include="*.ts" --include="*.tsx"
   ```

4. **Commit** once all type errors are fixed:
   ```bash
   git add tsconfig.json src/**/*.ts src/**/*.tsx
   git commit -m "chore: fix TypeScript strict mode violations"
   ```

---

## 📊 Pillar B – GA4 Analytics (✅ SCAFFOLDED)

### Files created:
- `src/lib/gtag.ts` – GA4 wrapper with convenience functions
- `src/components/GA4Tracker.tsx` – Page view tracker (client component)
- Updated `src/app/layout.tsx` – GA4 script injection + tracker inclusion

### How to use GA4 tracking in your components:

#### 1️⃣ **Automatic page views** (already working)
```tsx
// No code needed! GA4Tracker in layout.tsx fires pageview on every route change
// Just navigate – events are sent automatically
router.push('/products/123');  // ← GA4 captures this as "page_view"
```

#### 2️⃣ **Track product views** (in PDP component)
```tsx
// src/app/products/[id]/page.tsx
import { trackProductView } from '@/lib/gtag';

export default function ProductPage({ params }: { params: { id: string } }) {
  useEffect(() => {
    // Call after product data loads
    trackProductView({
      id: product.id,
      name: product.name,
      price: product.base_price,
      category: product.category?.name,
    });
  }, [product]);

  return <ProductDetailView product={product} />;
}
```

#### 3️⃣ **Track add-to-cart** (in cart logic)
```tsx
// src/lib/cart/utils.ts (or wherever you handle add-to-cart)
import { trackAddToCart } from '@/lib/gtag';

export async function addProductToCart(productId: string, quantity: number) {
  // 1. Add to backend
  await supabase
    .from('shopping_carts')
    .insert({ product_id: productId, quantity, user_id: userId });

  // 2. Fire GA4 event
  const product = await getProductById(productId);  // fetch product for event
  trackAddToCart({
    id: product.id,
    name: product.name,
    price: product.base_price,
    quantity,
  });
}
```

#### 4️⃣ **Track checkout started** (checkout page)
```tsx
// src/app/checkout/page.tsx (or CheckoutClient.tsx)
import { trackCheckoutStarted } from '@/lib/gtag';

export default function CheckoutPage() {
  useEffect(() => {
    // After cart loads, fire event
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    trackCheckoutStarted(subtotal, cartItems.length);
  }, [cartItems]);

  // ... rest of checkout UI
}
```

#### 5️⃣ **Track purchase completed** (payment success)
```tsx
// src/app/checkout/PaymentWidget.tsx (or wherever payment succeeds)
import { trackPurchaseCompleted } from '@/lib/gtag';

async function handlePaymentSuccess(razorpayOrderId: string) {
  // 1. Create order in DB
  const newOrder = await createOrder({
    razorpay_order_id: razorpayOrderId,
    user_id: userId,
    total: cartValue,
  });

  // 2. Fire GA4 purchase event
  trackPurchaseCompleted({
    order_id: newOrder.id,
    value: newOrder.total,
    items: newOrder.items.length,
    currency: 'INR',
  });

  // 3. Redirect to confirmation
  router.push(`/order-confirmation/${newOrder.id}`);
}
```

#### 6️⃣ **Custom events** (for other tracking needs)
```tsx
// Use the low-level 'event' function for custom events
import { event } from '@/lib/gtag';

// Track wishlist add
function addToWishlist(productId: string) {
  event('add_to_wishlist', { product_id: productId });
}

// Track filter applied
function applyShopFilter(filterName: string, value: string) {
  event('apply_filter', { filter: filterName, value });
}

// Track search
function trackSearch(query: string) {
  event('search', { search_term: query });
}
```

### ✅ Verification in GA4 Dashboard:

After deploying (to staging or production), check GA4:

1. Go to **Reports → Real-time**
2. Perform actions (navigate, view products, add to cart)
3. You should see events appearing in real-time
4. Look for: `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`

If you don't see events:
- Verify `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set in Vercel (Environment Variables → Public)
- Check browser DevTools → Network → filter "google-analytics" – you should see requests to `https://www.google-analytics.com/g/collect`
- Restart the dev server after adding the env var to `.env.local`

---

## 🚨 Pillar C – Sentry Error Tracking (✅ SCAFFOLDED)

### Files created:
- `src/lib/logger.ts` – Centralized logger (replaces `console.error` calls)
- `sentry.server.config.js` – Server-side Sentry config
- `sentry.client.config.js` – Client-side Sentry config

### How to use the logger:

#### 1️⃣ **Production error tracking** (API routes, server actions)
```tsx
// src/app/api/orders/create/route.ts
import { logger } from '@/lib/logger';
import { logPaymentError } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const order = await createOrderInDB({...});
    return Response.json({ orderId: order.id });
  } catch (error) {
    // Use logger instead of console.error
    logger.error(
      'Failed to create order',
      error as Error,
      {
        userId: req.user?.id,
        endpoint: '/api/orders/create',
        timestamp: new Date().toISOString(),
      }
    );
    return Response.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
```

#### 2️⃣ **Payment errors** (Razorpay/Stripe)
```tsx
// src/lib/payment/razorpay.ts
import { logPaymentError } from '@/lib/logger';

export async function verifyPayment(orderId: string, paymentId: string) {
  try {
    const isValid = await razorpay.payments.fetch(/* ... */);
    return isValid;
  } catch (error) {
    logPaymentError('razorpay', orderId, error);
    throw error;
  }
}
```

#### 3️⃣ **Database errors**
```tsx
// src/lib/supabase/products.ts
import { logDatabaseError } from '@/lib/logger';

export async function getProduct(id: string) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    logDatabaseError('SELECT', 'products', error);
    throw error;
  }
}
```

#### 4️⃣ **Authentication errors**
```tsx
// src/lib/auth/server.ts
import { logAuthError } from '@/lib/logger';

export async function verifyAuth() {
  try {
    const session = await getSession();
    if (!session) throw new Error('Not authenticated');
    return session.user;
  } catch (error) {
    logAuthError('Session verification failed', error);
    throw error;
  }
}
```

#### 5️⃣ **Debug logs** (development only)
```tsx
// Logs only appear in NODE_ENV=development (not sent to Sentry)
import { logger } from '@/lib/logger';

logger.debug('Cart items loaded', { count: cartItems.length });
// Output: [DEBUG] Cart items loaded {count: 3}
```

#### 6️⃣ **Info / Warning logs** (always sent)
```tsx
// Info (sent to Sentry)
logger.info('User signed up', { userId: user.id });

// Warning (sent to Sentry as "warning" level)
logger.warn('Payment received late', { orderId, delayMs: 5000 });

// Fatal (sent to Sentry as "critical")
logger.fatal('Database connection lost', error, {
  host: dbHost,
  port: dbPort,
});
```

### ✅ Verification in Sentry:

1. After deploying, trigger an error intentionally:
   ```bash
   # In the browser console while running the app
   throw new Error("🛑 Test Sentry error");
   ```

2. Go to **Sentry Dashboard → Issues**
3. You should see the new error appear within seconds
4. Click it to view full context (stack trace, environment, extra data)

If you don't see events:
- Verify `SENTRY_DSN` is set correctly (should start with `https://`)
- Confirm DSN is in **Vercel → Environment Variables → Secrets** (not Public)
- Check Sentry project → **Settings → Client Keys (DSN)** to copy the correct value
- Restart dev server after adding env var

### 🔒 Privacy & Security:
- The logger automatically **strips PII** (email, username, IP address)
- Error messages are sent, but user data is anonymized
- You can disable Sentry for local development (optional)

---

## 🚀 Next Steps After Day 1

| Week | Focus |
|------|-------|
| **Week 2** | Complete Razorpay integration, implement account pages, E2E tests |
| **Week 3** | Performance optimization, admin dashboard MVP |
| **Week 4** | Production deployment, monitoring setup, stakeholder demos |

---

## 📞 Troubleshooting

### TypeScript strict mode:
- **Issue:** `too many errors, don't know where to start`
  - **Solution:** Run `npx tsc --noEmit | head -20` to see first 20 errors; fix those, then re-run

### GA4 events not showing:
- **Issue:** `GA4 Real-time shows no events`
  - **Solution:** Check Network tab for requests to `google-analytics.com` (must be there); verify env var is set
  
### Sentry not capturing errors:
- **Issue:** `Errors don't appear in Sentry dashboard`
  - **Solution:** Verify DSN is correct; check browser console for `Sentry failed to send` warnings

---

## 📚 References

- **GA4 Event Documentation:** https://support.google.com/analytics/answer/9322688
- **Sentry Next.js Integration:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **TypeScript Strict Mode:** https://www.typescriptlang.org/tsconfig#strict

---

**Last Updated:** March 9, 2026  
**Status:** ✅ Ready for implementation
