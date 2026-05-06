# Staged Production Rollout Guide

**Deployment Date:** March 7, 2026  
**Strategy:** Staged rollout with smoke testing and monitoring  
**Rollback Plan:** Available via platform rollback or git revert

---

## 🎯 Rollout Overview

**Phase 1:** Deploy to production (0%)  
**Phase 2:** Smoke test critical functionality (< 5 min)  
**Phase 3:** Performance validation (10-15 min)  
**Phase 4:** Monitor initial traffic (1-24 hours)  
**Phase 5:** Full rollout validation (3-7 days)

---

## 📋 Pre-Deployment Checklist

Run these checks before deploying:

```powershell
# 1. Verify build passes
npm run build

# 2. Check for uncommitted changes
git status

# 3. Ensure on correct branch
git branch --show-current

# 4. Verify environment variables are set
Get-Content .env.local | Select-String "NEXT_PUBLIC_SUPABASE_URL"
Get-Content .env.local | Select-String "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
```

**All checks pass?** ✅ Proceed to deployment

---

## 🚀 Phase 1: Deploy to Production

### Step 1.1: Install Dependencies

```bash
npm install web-vitals
```

### Step 1.2: Commit Changes

```bash
git add .
git commit -m "feat: PDP performance optimizations

- Query parallelization (Promise.all for 4 secondary queries)
- 30-minute response caching with unstable_cache
- Cloudinary image optimization (f_auto, q_auto, dpr_auto)
- LCP image prioritization fixed (desktop + mobile)
- Resource preconnect for Cloudinary and Supabase
- Core Web Vitals RUM tracking

Expected improvements:
- TTFB: 40-60% reduction (cold), 95% reduction (cached)
- LCP: 20-40% reduction
- Image payload: 30-50% smaller

Refs: docs/PDP_PERFORMANCE_OPTIMIZATION_REPORT.md"
```

### Step 1.3: Deploy

**For Vercel:**
```bash
# Production deployment
vercel --prod

# Wait for deployment to complete
# Copy the production URL from output
```

**For Netlify:**
```bash
netlify deploy --prod
```

**For other platforms:**
```bash
# Push to main branch (if using CI/CD)
git push origin main

# Or use your platform's CLI
# Railway: railway up
# Render: git push render main
# AWS Amplify: amplify publish
```

### Step 1.4: Capture Deployment Info

```powershell
# Save deployment details
$deploymentInfo = @"
Deployment Information
=====================
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Branch: $(git branch --show-current)
Commit: $(git rev-parse --short HEAD)
Production URL: [COPY FROM DEPLOYMENT OUTPUT]
"@

$deploymentInfo | Out-File -FilePath "temp/deployment-info.txt"
Write-Host $deploymentInfo -ForegroundColor Cyan
```

---

## 🔍 Phase 2: Initial Smoke Test (< 5 minutes)

**Objective:** Verify critical functionality before performance testing

### Live PDP URL
```
[YOUR PRODUCTION URL]/product/crown-crest-premium-plain-cotton-t-shirt-180-gsm-super-combed
```

### Smoke Test Checklist

Open the production PDP in **2 browsers** (desktop + mobile or responsive mode):

#### Basic Functionality
- [ ] **Page loads successfully** - No 500 errors, no blank page
- [ ] **Product details render** - Title, price, description visible
- [ ] **Gallery displays** - Hero image loads, all gallery images present
- [ ] **Variant selector works** - Can click colors and sizes

#### Color Switching
- [ ] **Change color** → Gallery updates to new color's images
- [ ] **No flash/flicker** during transition
- [ ] **Selected state** persists correctly

#### Size Selection
- [ ] **Change size** → Price updates if different
- [ ] **Availability updates** → Out-of-stock sizes disabled
- [ ] **Size guide** opens if available

#### Cart Functionality
- [ ] **Add to Cart** → Loading state appears, item added, toast notification
- [ ] **Scroll down** → Sticky add-to-cart appears at correct trigger
- [ ] **Sticky Cart** → Loading state syncs with main button
- [ ] **Cart count** updates in header

#### Additional Checks
- [ ] **Pincode check** → Can enter pincode, delivery estimate shows
- [ ] **Accordion sections** → Description, size fit, composition expand/collapse
- [ ] **Breadcrumbs work** → Can navigate back to collection/home

#### Mobile-Specific
- [ ] **Carousel swiping** works smoothly
- [ ] **Thumbnail scrolling** works
- [ ] **Touch interactions** responsive

### Smoke Test Results

```powershell
# Document results
$smokeTest = Read-Host "Did all smoke tests pass? (y/n)"

if ($smokeTest -eq 'y' -or $smokeTest -eq 'Y') {
    Write-Host "✅ Smoke test PASSED - Proceeding to performance validation" -ForegroundColor Green
    "Smoke test: PASSED" | Out-File -FilePath "temp/rollout-log.txt" -Append
} else {
    Write-Host "❌ Smoke test FAILED - DO NOT PROCEED" -ForegroundColor Red
    Write-Host "Rollback immediately using: vercel rollback" -ForegroundColor Yellow
    "Smoke test: FAILED - Deployment should be rolled back" | Out-File -FilePath "temp/rollout-log.txt" -Append
    exit 1
}
```

---

## 📊 Phase 3: Performance Validation (10-15 minutes)

### Step 3.1: Run Automated Validation Script

```powershell
# Replace with your actual production URL
$productionUrl = Read-Host "Enter your production URL (e.g., https://your-domain.com)"

.\scripts\validate-production-performance.ps1 -ProductionUrl $productionUrl
```

**This script will:**
1. ✅ Run Lighthouse mobile audit
2. ✅ Display metrics with color-coded status
3. ✅ Guide Cloudinary optimization verification
4. ✅ Test cache behavior (cold vs warm)
5. ✅ Validate UX interactions
6. ✅ Generate comprehensive report

### Step 3.2: Manual Performance Checks

#### 3.2.1 Verify Cloudinary Optimization

**Browser:** Open production PDP  
**DevTools:** Network tab (Ctrl+Shift+E / Cmd+Option+E)

1. **Refresh page** (Ctrl+R)
2. **Filter by "Img"** in Network tab
3. **Find first product image**
4. **Check Request URL:**
   ```
   Should contain: /f_auto,q_auto:good,dpr_auto/
   Example: https://res.cloudinary.com/[cloud]/image/upload/f_auto,q_auto:good,dpr_auto/v123/product.jpg
   ```
5. **Check Response Headers:**
   - `Content-Type: image/webp` or `image/avif` ✅
   - `Content-Length: [should be 30-50% smaller than baseline]`
6. **Take screenshot** of Network tab for documentation

#### 3.2.2 Cache Behavior Validation

**Cold Cache Test:**
```powershell
Write-Host "=== COLD CACHE TEST ===" -ForegroundColor Yellow
Write-Host "1. Open browser in INCOGNITO/PRIVATE mode" -ForegroundColor White
Write-Host "2. Open DevTools → Network tab" -ForegroundColor White
Write-Host "3. Navigate to: $productionUrl/product/[slug]" -ForegroundColor White
Write-Host "4. Find document request (first row, type 'document')" -ForegroundColor White
Write-Host "5. Check 'Waiting (TTFB)' column" -ForegroundColor White
Write-Host ""

$coldTTFB = Read-Host "Enter cold cache TTFB in milliseconds"
Write-Host ""

if ($coldTTFB -lt 600) {
    Write-Host "✅ Cold TTFB ${coldTTFB}ms meets target < 600ms" -ForegroundColor Green
} elseif ($coldTTFB -lt 1000) {
    Write-Host "⚠️ Cold TTFB ${coldTTFB}ms above target but acceptable" -ForegroundColor Yellow
} else {
    Write-Host "❌ Cold TTFB ${coldTTFB}ms significantly above target" -ForegroundColor Red
}
```

**Warm Cache Test:**
```powershell
Write-Host ""
Write-Host "=== WARM CACHE TEST ===" -ForegroundColor Yellow
Write-Host "1. In SAME browser session, reload page (Ctrl+R)" -ForegroundColor White
Write-Host "2. Check document request TTFB again" -ForegroundColor White
Write-Host ""

$warmTTFB = Read-Host "Enter warm cache TTFB in milliseconds"
Write-Host ""

$improvement = [math]::Round((1 - ($warmTTFB / $coldTTFB)) * 100, 1)

Write-Host "Cache Performance:" -ForegroundColor Cyan
Write-Host "  Cold TTFB: ${coldTTFB}ms" -ForegroundColor White
Write-Host "  Warm TTFB: ${warmTTFB}ms" -ForegroundColor White
Write-Host "  Improvement: ${improvement}%" -ForegroundColor $(if ($improvement -gt 70) { "Green" } elseif ($improvement -gt 30) { "Yellow" } else { "Red" })
Write-Host ""

if ($improvement -gt 70) {
    Write-Host "✅ Cache performing excellently (>70% improvement)" -ForegroundColor Green
} elseif ($improvement -gt 30) {
    Write-Host "⚠️ Cache working but below expected (expected >80%)" -ForegroundColor Yellow
} else {
    Write-Host "❌ Cache not providing expected benefit - investigate" -ForegroundColor Red
}

# Log results
@"
Cache Behavior Test Results:
  Cold TTFB: ${coldTTFB}ms
  Warm TTFB: ${warmTTFB}ms
  Improvement: ${improvement}%
"@ | Out-File -FilePath "temp/rollout-log.txt" -Append
```

### Step 3.3: Review Lighthouse Results

```powershell
# Open HTML report
Start-Process "temp/lighthouse-prod.report.html"

Write-Host ""
Write-Host "Review Lighthouse report and confirm:" -ForegroundColor Cyan
Write-Host "  1. Performance score ≥ 85" -ForegroundColor White
Write-Host "  2. LCP < 2.5s (green in report)" -ForegroundColor White
Write-Host "  3. TTFB < 600ms" -ForegroundColor White
Write-Host "  4. CLS < 0.1" -ForegroundColor White
Write-Host ""

$lighthouseApproval = Read-Host "Does Lighthouse meet expectations? (y/n)"

if ($lighthouseApproval -eq 'y' -or $lighthouseApproval -eq 'Y') {
    Write-Host "✅ Performance validation PASSED" -ForegroundColor Green
    "Performance validation: PASSED" | Out-File -FilePath "temp/rollout-log.txt" -Append
} else {
    Write-Host "⚠️ Performance validation PARTIAL - Review report for improvement opportunities" -ForegroundColor Yellow
    "Performance validation: PARTIAL - needs review" | Out-File -FilePath "temp/rollout-log.txt" -Append
}
```

---

## 📈 Phase 4: Monitor Initial Traffic (First 24 Hours)

### Step 4.1: Enable Core Web Vitals Tracking

**Option A: PDP-only tracking (recommended for staged rollout)**

Add to `src/app/(storefront)/product/[slug]/page.tsx`:

```typescript
// At the top of the file
import { reportPDPVitals } from '@/lib/analytics/core-web-vitals'

// In the component (if it's a client component)
// OR create a separate client component:
'use client'
import { reportPDPVitals } from '@/lib/analytics/core-web-vitals'
import { useEffect } from 'react'

export function CoreWebVitalsTracker() {
  useEffect(() => {
    reportPDPVitals()
  }, [])
  return null
}

// Then add <CoreWebVitalsTracker /> to your page
```

**Commit and redeploy:**
```bash
git add src/app/(storefront)/product/[slug]/page.tsx
git commit -m "feat: enable Core Web Vitals tracking on PDP"
vercel --prod
```

### Step 4.2: Set Up Monitoring Dashboard

**Create a simple monitoring checklist:**

```powershell
# Save this as scripts/check-production-health.ps1
param(
    [string]$ProductionUrl
)

Write-Host "=== Production Health Check ===" -ForegroundColor Cyan
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# 1. Check if site is up
try {
    $response = Invoke-WebRequest -Uri "$ProductionUrl/product/crown-crest-premium-plain-cotton-t-shirt-180-gsm-super-combed" -Method Head -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Site is UP (Status: $($response.StatusCode))" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Site is DOWN or slow (Error: $($_.Exception.Message))" -ForegroundColor Red
}

# 2. Check response time
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    $response = Invoke-WebRequest -Uri "$ProductionUrl/product/crown-crest-premium-plain-cotton-t-shirt-180-gsm-super-combed" -TimeoutSec 30
    $stopwatch.Stop()
    $responseTime = $stopwatch.ElapsedMilliseconds
    
    if ($responseTime -lt 1000) {
        Write-Host "✅ Response time: ${responseTime}ms (Good)" -ForegroundColor Green
    } elseif ($responseTime -lt 2000) {
        Write-Host "⚠️ Response time: ${responseTime}ms (Acceptable)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Response time: ${responseTime}ms (Slow)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Manual checks to perform:" -ForegroundColor Yellow
Write-Host "  1. Check error logs in your hosting platform" -ForegroundColor White
Write-Host "  2. Verify no alerts in monitoring tools" -ForegroundColor White
Write-Host "  3. Check analytics for traffic volume" -ForegroundColor White
Write-Host "  4. Monitor conversion rate vs baseline" -ForegroundColor White
Write-Host ""
```

### Step 4.3: Monitoring Schedule (First 24 Hours)

**Hour 0 (Immediately after deployment):**
- ✅ Smoke test (completed in Phase 2)
- ✅ Performance validation (completed in Phase 3)

**Hour 1:**
```powershell
.\scripts\check-production-health.ps1 -ProductionUrl "https://your-domain.com"
```
- Check hosting platform error logs
- Verify no spike in error rate

**Hour 6:**
```powershell
.\scripts\check-production-health.ps1 -ProductionUrl "https://your-domain.com"
```
- Review analytics for traffic patterns
- Check if any user complaints filed

**Hour 12:**
```powershell
.\scripts\check-production-health.ps1 -ProductionUrl "https://your-domain.com"
```
- Review conversion rate vs previous day
- Check bounce rate on PDP

**Hour 24:**
```powershell
.\scripts\check-production-health.ps1 -ProductionUrl "https://your-domain.com"
```
- Full metric comparison vs baseline
- Decision point: proceed to Phase 5 or rollback

---

## 🎯 Phase 5: Full Rollout Validation (Days 2-7)

### Daily Monitoring (Days 2-7)

Run this checklist once per day:

**Quantitative Metrics:**
- [ ] Google Search Console → Core Web Vitals (starts showing data after ~1 day)
  - LCP P75 < 2.5s
  - FID P75 < 100ms
  - CLS P75 < 0.1
- [ ] Analytics → PDP pageviews (compare to previous week)
- [ ] Analytics → Conversion rate (compare to previous week)
- [ ] Analytics → Bounce rate (compare to previous week)
- [ ] Error monitoring → Error rate (should not increase)

**Qualitative Checks:**
- [ ] Customer support tickets mentioning "slow" or "not loading"
- [ ] Social media mentions of page speed
- [ ] Internal QA team feedback

### Week 1 Summary Report

After 7 days, compile comprehensive report:

```powershell
# Generate Week 1 summary
$week1Report = @"
Week 1 Rollout Summary
======================
Deployment Date: $(Get-Content temp/deployment-info.txt | Select-String "Date")
Monitoring Period: $(Get-Date (Get-Date).AddDays(-7) -Format "yyyy-MM-dd") to $(Get-Date -Format "yyyy-MM-dd")

PERFORMANCE METRICS (from Google Search Console):
  LCP P75: [FILL IN]s (Target: < 2.5s) [✅/❌]
  FID P75: [FILL IN]ms (Target: < 100ms) [✅/❌]
  CLS P75: [FILL IN] (Target: < 0.1) [✅/❌]

BUSINESS METRICS:
  Avg daily PDP pageviews: [FILL IN] (Baseline: [FILL IN]) [Change: ±X%]
  Conversion rate: [FILL IN]% (Baseline: [FILL IN]%) [Change: ±X%]
  Bounce rate: [FILL IN]% (Baseline: [FILL IN]%) [Change: ±X%]
  Avg session duration: [FILL IN]s (Baseline: [FILL IN]s) [Change: ±X%]

OPERATIONAL METRICS:
  Error rate: [FILL IN]% (Baseline: [FILL IN]%) [Change: ±X%]
  Support tickets (speed-related): [FILL IN]
  Downtime incidents: [FILL IN]

OVERALL ASSESSMENT: [SUCCESS / PARTIAL SUCCESS / NEEDS IMPROVEMENT]

RECOMMENDATION: [KEEP / ITERATE / ROLLBACK]
"@

$week1Report | Out-File -FilePath "temp/week1-rollout-summary.txt"
Write-Host $week1Report -ForegroundColor Cyan
```

---

## ✅ Rollout Success Criteria

### Go/No-Go Decision Points

**After Phase 2 (Smoke Test):**
- **GO:** All functionality works ✅
- **NO-GO:** Any critical feature broken → Immediate rollback

**After Phase 3 (Performance Validation):**
- **GO:** LCP < 3.0s AND TTFB < 800ms (acceptable start)
- **CAUTION:** LCP 3.0-3.5s OR TTFB 800-1000ms → Monitor closely
- **NO-GO:** LCP > 4.0s OR TTFB > 1200ms → Investigate before continuing

**After Phase 4 (24 Hours):**
- **GO:** Error rate stable, no user complaints, metrics trending positive
- **CAUTION:** Minor issues detected → Plan fixes for next iteration
- **NO-GO:** Error rate spike OR conversion drop > 10% → Rollback

**After Phase 5 (7 Days):**
- **FULL SUCCESS:** LCP P75 < 2.5s AND TTFB P75 < 600ms AND conversion stable/improved
- **PARTIAL SUCCESS:** 1 metric missed but overall improvement → Keep, plan next iteration
- **NEEDS WORK:** Multiple metrics missed → Implement additional optimizations

---

## 🔄 Rollback Procedure

**If rollback is necessary at any phase:**

### Immediate Rollback (Vercel)
```bash
vercel rollback
```

### Immediate Rollback (Other platforms)
```bash
# Netlify
netlify rollback

# Git-based rollback (if no platform CLI)
git revert HEAD
git push origin main
```

### Post-Rollback Actions
1. Document reason for rollback in `temp/rollout-log.txt`
2. Review logs and errors to identify root cause
3. Fix issues in development environment
4. Re-run local testing
5. Schedule new deployment attempt

---

## 📊 Expected Results Timeline

**Phase 2 (Immediate):** Functional parity with pre-deployment ✅  
**Phase 3 (15 min):** Lighthouse LCP 2.2-2.8s, TTFB 400-700ms cold / 30-100ms cached ✅  
**Phase 4 (24 hours):** No error spike, stable traffic ✅  
**Phase 5 (7 days):** GSC Core Web Vitals LCP P75 < 2.5s, TTFB P75 < 600ms ✅

---

## 📝 Deployment Log

Track all phases in `temp/rollout-log.txt`:

```powershell
"=== STAGED ROLLOUT LOG ===" | Out-File -FilePath "temp/rollout-log.txt"
"Start time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File -FilePath "temp/rollout-log.txt" -Append
"" | Out-File -FilePath "temp/rollout-log.txt" -Append
```

Each phase will append status to this log.

---

**Prepared by:** GitHub Copilot  
**Date:** March 7, 2026  
**Strategy:** Staged rollout with progressive validation  
**Next Review:** After Week 1 completion
