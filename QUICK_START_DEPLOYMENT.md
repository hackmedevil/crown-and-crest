# Production Deployment Quick Start

**📋 Quick Reference - Execute this deployment workflow**

---

## ⚡ STEP 1: Pre-Flight Check (2 min)

```powershell
# Run these commands in order
cd "C:\Users\user\Desktop\Web App\crown-and-crest"

# 1. Verify build passes
npm run build

# 2. Install web-vitals for monitoring
npm install web-vitals

# 3. Check git status
git status

# 4. Verify you're on the correct branch
git branch --show-current
```

**All green?** → Proceed to Step 2  
**Any red?** → Fix issues before deploying

---

## 🚀 STEP 2: Deploy (5 min)

```bash
# Commit all performance optimizations
git add .
git commit -m "feat: PDP performance optimizations (TTFB + LCP improvements)"

# Deploy to production
# Choose your platform:

# VERCEL:
vercel --prod

# NETLIFY:
netlify deploy --prod

# CI/CD (GitHub, GitLab, etc.):
git push origin main
```

**Copy your production URL from the deployment output!**

---

## ✅ STEP 3: Smoke Test (5 min)

Open your **production PDP** in a browser:
```
https://[YOUR-DOMAIN]/product/crown-crest-premium-plain-cotton-t-shirt-180-gsm-super-combed
```

**Test these critical functions:**
- [ ] Page loads without errors
- [ ] Can change colors → gallery updates
- [ ] Can select sizes → price updates
- [ ] Can add to cart → item added successfully
- [ ] Scroll down → sticky cart appears
- [ ] Pincode check works

**All working?** → Proceed to Step 4  
**Anything broken?** → ROLLBACK NOW: `vercel rollback`

---

## 📊 STEP 4: Performance Validation (15 min)

```powershell
# Run automated validation script
# Replace with YOUR actual production URL
.\scripts\validate-production-performance.ps1 -ProductionUrl "https://your-domain.com"
```

This will:
1. Run Lighthouse mobile audit
2. Show you metrics with pass/fail status
3. Guide you through manual verification steps
4. Generate comprehensive report

**Look for:**
- ✅ LCP < 2.5s
- ✅ TTFB < 600ms (cold) or dramatic improvement on warm cache
- ✅ Performance Score ≥ 85

---

## 🔍 STEP 5: Cache Behavior Test (5 min)

### Test Cold Cache:
1. Open production PDP in **incognito/private mode**
2. Open DevTools → Network tab
3. Load the page
4. Find first request (type: document)
5. Note the "Waiting (TTFB)" value → **Should be < 600ms**

### Test Warm Cache:
1. In same browser, **reload the page** (Ctrl+R)
2. Check TTFB again → **Should be 80-95% faster**

**Example:**
- Cold TTFB: 500ms
- Warm TTFB: 50ms
- Improvement: 90% ✅

---

## 📈 STEP 6: Monitor (Ongoing)

```powershell
# Run health check right after deployment
.\scripts\check-production-health.ps1 -ProductionUrl "https://your-domain.com"

# Run again after:
# - 1 hour
# - 6 hours  
# - 12 hours
# - 24 hours
```

**Monitor for:**
- Site stays UP (no 500 errors)
- Response time stays < 2 seconds
- No spike in error rate
- Conversion rate stable

---

## 📝 STEP 7: Enable Real User Monitoring

**Quick Setup (5 min):**

1. Open `src/app/(storefront)/product/[slug]/page.tsx`

2. Add at the top of the file (after imports):
   ```typescript
   import { reportPDPVitals } from '@/lib/analytics/core-web-vitals'
   ```

3. Add this client component somewhere in the file:
   ```typescript
   'use client'
   function WebVitalsTracker() {
     useEffect(() => {
       reportPDPVitals()
     }, [])
     return null
   }
   ```

4. Include `<WebVitalsTracker />` in your page JSX

5. Commit and deploy:
   ```bash
   git add .
   git commit -m "feat: enable Core Web Vitals tracking"
   vercel --prod
   ```

---

## 📊 STEP 8: Check Results After 7 Days

After 1 week of monitoring:

1. **Google Search Console** → Core Web Vitals
   - Check LCP P75 < 2.5s
   - Check FID P75 < 100ms
   - Check CLS P75 < 0.1

2. **Analytics Dashboard**
   - Compare PDP traffic vs previous week
   - Compare conversion rate vs previous week
   - Check bounce rate trend

3. **Fill out report** using `docs/PRODUCTION_VALIDATION_TEMPLATE.md`

---

## 🎯 Success Criteria

**Minimum targets to consider deployment successful:**

| Metric | Target | Status |
|--------|--------|--------|
| **LCP** | < 2.5s | Check after deployment |
| **TTFB** | < 600ms (cold)<br>< 100ms (cached) | Check after deployment |
| **CLS** | < 0.1 | Check after deployment |
| **Conversion Rate** | Stable or improved | Check after 7 days |
| **Error Rate** | No increase | Check after 24 hours |

---

## 🔄 Rollback Plan

**If anything goes wrong:**

```bash
# Immediate rollback (Vercel)
vercel rollback

# Or revert and redeploy
git revert HEAD
git push origin main
```

**When to rollback:**
- ❌ Critical functionality broken (Smoke test fails)
- ❌ LCP > 5s (worse than baseline)
- ❌ Error rate spike > 50%
- ❌ Conversion drop > 10% after 24 hours

---

## 📞 Need Help?

**Troubleshooting guides:**
- Full details: `STAGED_ROLLOUT_GUIDE.md`
- Deployment steps: `DEPLOYMENT_GUIDE.md`
- Performance report: `docs/PDP_PERFORMANCE_OPTIMIZATION_REPORT.md`

**Common issues:**
- **Build fails**: Check `npm run build` output for TypeScript errors
- **Lighthouse fails**: Ensure production URL is correct and accessible
- **Cache not working**: Check Next.js production mode is enabled
- **Images not optimized**: Verify Cloudinary env vars are set

---

## ✅ Deployment Checklist

Print this and check off as you go:

- [ ] Pre-flight build test passed
- [ ] web-vitals installed
- [ ] Code committed with descriptive message
- [ ] Deployed to production successfully
- [ ] Production URL captured
- [ ] Smoke test passed (all features working)
- [ ] Lighthouse validation completed
- [ ] LCP < 2.5s OR identify why not
- [ ] TTFB < 600ms OR cache shows 80%+ improvement
- [ ] Cloudinary transforms verified in DevTools
- [ ] Cache behavior tested (cold + warm)
- [ ] Health check script run successfully
- [ ] Monitoring scheduled (1h, 6h, 12h, 24h)
- [ ] Core Web Vitals tracking enabled (optional Day 1, required Week 1)
- [ ] Week 1 review scheduled in calendar

---

**Time estimate:** 30-45 minutes for initial deployment + validation  
**Monitoring:** 5 minutes per check (4 checks in first 24 hours)  
**Week 1 review:** 15 minutes to compile metrics

**You've got this! 🚀**
