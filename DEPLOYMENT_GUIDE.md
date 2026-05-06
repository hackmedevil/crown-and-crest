# Production Deployment Guide

**Phase:** Post-Performance Optimization  
**Date:** March 7, 2026  
**Status:** Ready for Production Deployment

---

## 📋 Pre-Deployment Checklist

- [x] All TypeScript compilations pass (`npm run build`)
- [x] No ESLint errors on critical paths
- [x] Performance optimizations implemented:
  - [x] Database query parallelization
  - [x] 30-minute response caching
  - [x] Cloudinary image optimization
  - [x] LCP image prioritization
  - [x] Resource preconnect hints
- [x] Build validation complete
- [x] Development testing passed

---

## 🚀 Deployment Steps

### Step 1: Install web-vitals Package

```bash
npm install web-vitals
```

### Step 2: Commit Changes

```bash
git add .
git commit -m "feat: PDP performance optimizations (TTFB + LCP improvements)"
```

### Step 3: Deploy to Production

**For Vercel:**
```bash
vercel --prod
```

**For other platforms:**
Follow your standard deployment process (push to main branch, CI/CD pipeline, etc.)

### Step 4: Verify Deployment

```bash
# Check deployment status
curl -I https://your-production-domain.com/product/[slug]

# Should return 200 OK
```

---

## ✅ Post-Deployment Validation

### Automated Validation Script

Run the comprehensive validation script:

```powershell
# Replace with your actual production URL
.\scripts\validate-production-performance.ps1 -ProductionUrl "https://your-domain.com"
```

This script will:
1. ✅ Run Lighthouse mobile audit
2. ✅ Guide Cloudinary optimization verification
3. ✅ Test cache behavior (cold vs warm)
4. ✅ Validate variant interaction UX
5. ✅ Generate validation report

---

### Manual Validation Steps

#### 1. Lighthouse Production Audit

```bash
npx lighthouse https://your-domain.com/product/[slug] \
  --only-categories=performance \
  --form-factor=mobile \
  --throttling-method=simulate \
  --output=json \
  --output=html \
  --output-path=temp/lighthouse-prod
```

**Open:** `temp/lighthouse-prod.report.html`

**Target Metrics:**
- LCP < 2.5s ✅
- TTFB < 600ms ✅
- CLS < 0.1 ✅
- Performance Score > 90

---

#### 2. Verify Cloudinary Optimization

**Steps:**
1. Open production PDP in browser
2. Open DevTools → Network tab
3. Refresh page
4. Find first product image request
5. Check URL includes: `/f_auto,q_auto:good,dpr_auto/`
6. Check `Content-Type` header: `image/webp` or `image/avif`
7. Compare file size with baseline (should be 30-50% smaller)

**Expected URL format:**
```
https://res.cloudinary.com/[cloud]/image/upload/f_auto,q_auto:good,dpr_auto/v123/product.jpg
```

---

#### 3. Cache Behavior Validation

**Cold Cache Test:**
1. Open browser in incognito/private mode
2. Open DevTools → Network tab → Disable cache checkbox OFF
3. Navigate to PDP
4. Find document request (first HTML request)
5. Record "Waiting (TTFB)" time

**Warm Cache Test:**
1. In same browser session, reload page (Ctrl+R or Cmd+R)
2. Check document request TTFB
3. Should be 90-95% faster than cold cache

**Expected Results:**
- Cold TTFB: 400-700ms (down from 1.12s baseline)
- Warm TTFB: 30-100ms (95% improvement)

---

#### 4. Variant Interaction Test

Test these scenarios on production:

- [ ] **Color change** → Gallery updates instantly (no flash/flicker)
- [ ] **Size change** → Price updates correctly
- [ ] **Scroll down** → Sticky add-to-cart appears smoothly
- [ ] **Sticky add-to-cart** → Loading state syncs with main button
- [ ] **Out-of-stock variant** → Both buttons disabled correctly
- [ ] **Add to cart** → Item added, toast notification appears
- [ ] **Buy now** → Redirects to checkout with item in cart

All should be **as fast or faster** than before optimization.

---

## 📊 Enable Real User Monitoring (RUM)

### Step 1: Add Core Web Vitals Tracking

**Option A: Track on PDP only (recommended)**

Add to [src/app/(storefront)/product/[slug]/ProductDetailClient.tsx](src/app/(storefront)/product/[slug]/ProductDetailClient.tsx):

```typescript
import { reportPDPVitals } from '@/lib/analytics/core-web-vitals'
import { useEffect } from 'react'

export default function ProductDetailClient({ pdpData, ...props }) {
  // Existing code...

  useEffect(() => {
    reportPDPVitals()
  }, [])

  return (
    // Existing JSX...
  )
}
```

**Option B: Track site-wide**

Add to [src/app/layout.tsx](src/app/layout.tsx):

```typescript
'use client'

import { reportWebVitals } from '@/lib/analytics/core-web-vitals'
import { useEffect } from 'react'

function WebVitalsReporter() {
  useEffect(() => {
    reportWebVitals()
  }, [])
  return null
}

// Then add <WebVitalsReporter /> in your layout
```

---

### Step 2: Configure Analytics Endpoint (Optional)

Set environment variable for custom analytics:

```bash
# .env.local or production environment
NEXT_PUBLIC_ANALYTICS_ENDPOINT=https://your-analytics-api.com/metrics
```

Or use Google Analytics 4 (already integrated in code).

---

### Step 3: Monitor Metrics

**Google Search Console:**
1. Go to Search Console → Core Web Vitals
2. Wait 3-7 days for data collection
3. Check P75 (75th percentile) metrics

**Custom Dashboard:**
Query your analytics endpoint for:
- LCP P50, P75, P95
- TTFB P50, P75, P95
- CLS P50, P75, P95

**Success Criteria:**
| Metric | P75 Target | Status |
|--------|-----------|--------|
| Mobile LCP | < 2.5s | Track |
| Mobile TTFB | < 600ms | Track |
| Desktop LCP | < 2.0s | Track |
| Desktop TTFB | < 500ms | Track |
| CLS | < 0.1 | Track |

---

## 🔧 Troubleshooting

### If LCP Still > 2.5s

**Quick fixes:**
1. Add hero image preload in page `<head>`:
   ```tsx
   <link rel="preload" as="image" href={heroImageUrl} fetchpriority="high" />
   ```

2. Add explicit width to Cloudinary URL:
   ```typescript
   optimizeCloudinaryUrl(url, { width: 800, ... })
   ```

3. Enable blur-up placeholder for perceived performance

**See:** Section 7.2 in [PDP_PERFORMANCE_OPTIMIZATION_REPORT.md](PDP_PERFORMANCE_OPTIMIZATION_REPORT.md)

---

### If TTFB Still > 600ms

**Quick fixes:**
1. Check Supabase query performance:
   ```typescript
   // Add to getProductForPDP
   console.time('[PDP] Query time')
   const result = await supabaseServer...
   console.timeEnd('[PDP] Query time')
   ```

2. Verify cache is active:
   - Check Next.js build logs for data cache hits
   - Test with multiple page loads (should be fast after first)

3. Consider edge rendering (Vercel Edge Functions)

---

### If UX Issues Occur

**Rollback plan:**
```bash
# Revert to previous deployment
vercel rollback
```

**Debug steps:**
1. Check browser console for errors
2. Verify [ProductDetailClient.tsx](src/app/(storefront)/product/[slug]/ProductDetailClient.tsx) state management
3. Test variant selection → gallery update flow
4. Confirm sticky/main cart sync logic

---

## 📈 Success Metrics

### Immediate (Day 1)
- [ ] Lighthouse LCP < 2.5s on production
- [ ] Lighthouse TTFB < 600ms on production
- [ ] Cloudinary transforms verified in DevTools
- [ ] Cache behavior validated (90%+ improvement warm vs cold)
- [ ] All UX interactions working correctly

### Week 1
- [ ] RUM data showing P75 LCP < 2.5s
- [ ] RUM data showing P75 TTFB < 600ms
- [ ] No increase in error rate or bounce rate
- [ ] Google Search Console showing improved CWV

### Month 1
- [ ] Conversion rate stable or improved
- [ ] Page load abandonment rate decreased
- [ ] Search ranking stable or improved (CWV is ranking factor)

---

## 🎯 Expected Results

Based on optimizations implemented:

| Metric | Baseline | Expected | Status Target |
|--------|----------|----------|---------------|
| **Mobile LCP** | 3.59s | 2.2-2.8s | ✅ < 2.5s |
| **Mobile TTFB** | 1.12s | 400-700ms (cold)<br>30-100ms (cached) | ✅ < 600ms |
| **Image Size** | Baseline | 30-50% smaller | ✅ Improved |
| **Performance Score** | 79 | 85-95 | ✅ 90+ target |

**Confidence Level:** High for TTFB/cache, Medium-High for LCP (depends on Cloudinary CDN performance in production)

---

## 📝 Documentation

- **Implementation Details:** [PDP_PERFORMANCE_OPTIMIZATION_REPORT.md](PDP_PERFORMANCE_OPTIMIZATION_REPORT.md)
- **Validation Script:** [scripts/validate-production-performance.ps1](scripts/validate-production-performance.ps1)
- **Monitoring Code:** [src/lib/analytics/core-web-vitals.ts](src/lib/analytics/core-web-vitals.ts)

---

## ✅ Deployment Approval

Ready for production deployment when:
- [x] All pre-deployment checks pass
- [x] Stakeholder approval obtained
- [x] Rollback plan documented
- [ ] Validation scripts tested locally
- [ ] Analytics endpoint configured (if using custom)

**Recommended deployment window:** Non-peak hours (e.g., evening/overnight)

---

**Prepared by:** GitHub Copilot  
**Date:** March 7, 2026  
**Next Review:** After 7 days of production monitoring
