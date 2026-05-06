# Production Performance Validation Script
# Run this AFTER deploying to production

param(
    [Parameter(Mandatory=$true)]
    [string]$ProductionUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$ProductSlug = "crown-crest-premium-plain-cotton-t-shirt-180-gsm-super-combed"
)

$PDP_URL = "$ProductionUrl/product/$ProductSlug"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Production Performance Validation" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target URL: $PDP_URL" -ForegroundColor Yellow
Write-Host ""

# 1. Run Lighthouse Mobile Audit
Write-Host "[1/5] Running Lighthouse Mobile Audit..." -ForegroundColor Green
npx lighthouse $PDP_URL `
    --only-categories=performance `
    --form-factor=mobile `
    --throttling-method=simulate `
    --output=json `
    --output=html `
    --output-path=temp/lighthouse-prod `
    --quiet

if ($LASTEXITCODE -eq 0) {
    Write-Host "+ Lighthouse audit complete" -ForegroundColor Green
    
    # Extract metrics
    $lh = Get-Content 'temp/lighthouse-prod.report.json' | ConvertFrom-Json
    $metrics = $lh.audits
    
    Write-Host ""
    Write-Host "=== PRODUCTION PERFORMANCE METRICS ===" -ForegroundColor Cyan
    
    $perfScore = [math]::Round($lh.categories.performance.score * 100, 1)
    $lcp = [math]::Round($metrics.'largest-contentful-paint'.numericValue / 1000, 2)
    $ttfb = [math]::Round($metrics.'server-response-time'.numericValue, 0)
    $cls = [math]::Round($metrics.'cumulative-layout-shift'.numericValue, 6)
    $fcp = [math]::Round($metrics.'first-contentful-paint'.numericValue / 1000, 2)
    $tbt = [math]::Round($metrics.'total-blocking-time'.numericValue, 0)
    $si = [math]::Round($metrics.'speed-index'.numericValue / 1000, 2)
    
    Write-Host ("Performance Score: " + $perfScore) -ForegroundColor $(if ($perfScore -ge 90) { "Green" } elseif ($perfScore -ge 50) { "Yellow" } else { "Red" })
    Write-Host ("LCP: " + $lcp + "s") -ForegroundColor $(if ($lcp -lt 2.5) { "Green" } elseif ($lcp -lt 4.0) { "Yellow" } else { "Red" })
    Write-Host ("TTFB: " + $ttfb + "ms") -ForegroundColor $(if ($ttfb -lt 600) { "Green" } elseif ($ttfb -lt 1000) { "Yellow" } else { "Red" })
    Write-Host ("CLS: " + $cls) -ForegroundColor $(if ($cls -lt 0.1) { "Green" } elseif ($cls -lt 0.25) { "Yellow" } else { "Red" })
    Write-Host ("FCP: " + $fcp + "s") -ForegroundColor White
    Write-Host ("TBT: " + $tbt + "ms") -ForegroundColor White
    Write-Host ("SI: " + $si + "s") -ForegroundColor White
    Write-Host ""
    
    # Check targets
    Write-Host "Target Validation:" -ForegroundColor Cyan
    if ($lcp -lt 2.5) {
        Write-Host "  + LCP less than 2.5s target MET" -ForegroundColor Green
    } else {
        Write-Host "  - LCP target MISSED (current: ${lcp}s, target: 2.5s, delta: +$([math]::Round($lcp - 2.5, 2))s)" -ForegroundColor Red
    }
    
    if ($ttfb -lt 600) {
        Write-Host "  + TTFB less than 600ms target MET" -ForegroundColor Green
    } else {
        Write-Host "  - TTFB target MISSED (current: ${ttfb}ms, target: 600ms, delta: +$([math]::Round($ttfb - 600, 0))ms)" -ForegroundColor Red
    }
    
    if ($cls -lt 0.1) {
        Write-Host "  + CLS less than 0.1 target MET" -ForegroundColor Green
    } else {
        Write-Host "  ! CLS above target (current: $cls)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Full HTML report: temp/lighthouse-prod.report.html" -ForegroundColor Gray
    
} else {
    Write-Host "- Lighthouse audit failed" -ForegroundColor Red
    exit 1
}

# 2. Cloudinary Optimization Check
Write-Host ""
Write-Host "[2/5] Cloudinary Optimization Check" -ForegroundColor Green
Write-Host "Please manually verify in browser DevTools:" -ForegroundColor Yellow
Write-Host "  1. Open $PDP_URL" -ForegroundColor White
Write-Host "  2. Open DevTools → Network tab" -ForegroundColor White
Write-Host "  3. Find first product image request" -ForegroundColor White
Write-Host "  4. Check URL contains: /f_auto,q_auto:good,dpr_auto/" -ForegroundColor White
Write-Host "  5. Check Content-Type header: image/webp or image/avif" -ForegroundColor White
Write-Host "  6. Compare file size with baseline" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter when verification is complete"

# 3. Cache Behavior Test
Write-Host ""
Write-Host "[3/5] Cache Behavior Test" -ForegroundColor Green
Write-Host ""
Write-Host "COLD CACHE TEST:" -ForegroundColor Yellow
Write-Host "  1. Open browser in incognito/private mode" -ForegroundColor White
Write-Host "  2. Open DevTools → Network tab" -ForegroundColor White
Write-Host "  3. Navigate to: $PDP_URL" -ForegroundColor White
Write-Host "  4. Find document request (first one)" -ForegroundColor White
Write-Host "  5. Record 'Waiting (TTFB)' time" -ForegroundColor White
Write-Host ""
$coldTTFB = Read-Host "Enter cold cache TTFB (in ms)"
Write-Host ""

Write-Host "WARM CACHE TEST:" -ForegroundColor Yellow
Write-Host "  1. In same browser session, reload the page (Ctrl+R)" -ForegroundColor White
Write-Host "  2. Check Network tab document request" -ForegroundColor White
Write-Host "  3. Record 'Waiting (TTFB)' time" -ForegroundColor White
Write-Host ""
$warmTTFB = Read-Host "Enter warm cache TTFB (in ms)"
Write-Host ""

if ($coldTTFB -and $warmTTFB) {
    $improvement = [math]::Round((1 - ($warmTTFB / $coldTTFB)) * 100, 1)
    Write-Host "Cache Performance:" -ForegroundColor Cyan
    Write-Host "  Cold TTFB: ${coldTTFB}ms" -ForegroundColor White
    Write-Host "  Warm TTFB: ${warmTTFB}ms" -ForegroundColor White
    Write-Host "  Improvement: ${improvement}%" -ForegroundColor $(if ($improvement -gt 50) { "Green" } else { "Yellow" })
}

# 4. Variant Interaction Test
Write-Host ""
Write-Host "[4/5] Variant Interaction Test" -ForegroundColor Green
Write-Host "Testing UX functionality post-optimization..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please manually test the following:" -ForegroundColor Yellow
Write-Host "  1. Change color → Gallery updates instantly" -ForegroundColor White
Write-Host "  2. Change size → Price updates correctly" -ForegroundColor White
Write-Host "  3. Scroll down → Sticky add-to-cart appears" -ForegroundColor White
Write-Host "  4. Click sticky 'Add to Cart' → Loading state syncs with main button" -ForegroundColor White
Write-Host "  5. Select out-of-stock variant → Buttons disabled correctly" -ForegroundColor White
Write-Host ""
$uxPass = Read-Host "Did all UX tests pass? (y/n)"

if ($uxPass -eq 'y' -or $uxPass -eq 'Y') {
    Write-Host "  + UX functionality validated" -ForegroundColor Green
} else {
    Write-Host "  - UX issues detected - review required" -ForegroundColor Red
}

# 5. Summary Report
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Validation Summary" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Build status indicators
$lcpStatus = if ($lcp -lt 2.5) { "PASS" } else { "FAIL" }
$ttfbStatus = if ($ttfb -lt 600) { "PASS" } else { "FAIL" }
$clsStatus = if ($cls -lt 0.1) { "PASS" } else { "WARN" }
$uxStatus = if ($uxPass -eq 'y' -or $uxPass -eq 'Y') { "PASS" } else { "FAIL" }

# Build recommendations
$recommendations = ""
if ($lcp -ge 2.5) {
    $recommendations += "  - LCP still above target: Implement hero image preload + width hints`n"
}
if ($ttfb -ge 600) {
    $recommendations += "  - TTFB above target: Check Supabase query performance + edge caching`n"
}
if ($uxPass -ne 'y' -and $uxPass -ne 'Y') {
    $recommendations += "  - UX issues: Debug variant interaction logic`n"
}
if ($recommendations -eq "") {
    $recommendations = "  - All targets met! Monitor RUM data for continued validation`n"
}

$nextSteps = @"
Next Steps:
  A. Enable RUM monitoring (see src/lib/analytics/core-web-vitals.ts)
  B. Monitor for 3-7 days to collect real-user data
  C. Review Google Search Console Core Web Vitals report
"@

$summary = @"
Production Performance Validation Results
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
URL: $PDP_URL

LIGHTHOUSE METRICS (Mobile):
  Performance Score: $perfScore
  LCP: ${lcp}s [$lcpStatus]
  TTFB: ${ttfb}ms [$ttfbStatus]
  CLS: $cls [$clsStatus]
  FCP: ${fcp}s
  TBT: ${tbt}ms
  Speed Index: ${si}s

CACHE BEHAVIOR:
  Cold TTFB: ${coldTTFB}ms
  Warm TTFB: ${warmTTFB}ms
  Cache Improvement: ${improvement}%

UX VALIDATION:
  Variant Switching: $uxStatus

RECOMMENDATIONS:
$recommendations
$nextSteps
"@

Write-Host $summary
$summary | Out-File -FilePath "temp/production-validation-report.txt" -Encoding UTF8

Write-Host ""
Write-Host "Report saved to: temp/production-validation-report.txt" -ForegroundColor Green
Write-Host "HTML Lighthouse report: temp/lighthouse-prod.report.html" -ForegroundColor Green
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Validation Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
