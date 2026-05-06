# Day 1 Foundations – Quick Setup Check (Windows PowerShell)
# Run this to validate the installation and provide next steps

Write-Host "Crown and Crest - Day 1 Foundations Setup Checker" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()

# 1. Check TypeScript strict mode
Write-Host "Checking TypeScript configuration..." -ForegroundColor Green
$tsconfig = Get-Content "tsconfig.json" -Raw
if ($tsconfig -match '"strict":\s*true') {
  Write-Host "  OK - Strict mode enabled" -ForegroundColor Green
} else {
  Write-Host "  ERROR - Strict mode NOT enabled" -ForegroundColor Red
  $errors += "tsconfig.json"
}

# 2. Check GA4 files
Write-Host "Checking GA4 files..." -ForegroundColor Green
$ga4Files = @("src/lib/gtag.ts", "src/components/GA4Tracker.tsx")
foreach ($file in $ga4Files) {
  if (Test-Path $file) {
    Write-Host "  OK - $file" -ForegroundColor Green
  } else {
    Write-Host "  ERROR - $file MISSING" -ForegroundColor Red
    $errors += $file
  }
}

# 3. Check Logger files
Write-Host "Checking Logger files..." -ForegroundColor Green
if (Test-Path "src/lib/logger.ts") {
  Write-Host "  OK - src/lib/logger.ts" -ForegroundColor Green
} else {
  Write-Host "  ERROR - src/lib/logger.ts MISSING" -ForegroundColor Red
  $errors += "src/lib/logger.ts"
}

# 4. Check Sentry config
Write-Host "Checking Sentry configuration..." -ForegroundColor Green
$sentryFiles = @("sentry.server.config.js", "sentry.client.config.js")
foreach ($file in $sentryFiles) {
  if (Test-Path $file) {
    Write-Host "  OK - $file" -ForegroundColor Green
  } else {
    Write-Host "  ERROR - $file MISSING" -ForegroundColor Red
    $errors += $file
  }
}

# 5. Check .env.example
Write-Host "Checking environment variable documentation..." -ForegroundColor Green
if (Test-Path ".env.example") {
  Write-Host "  OK - .env.example" -ForegroundColor Green
} else {
  Write-Host "  ERROR - .env.example MISSING" -ForegroundColor Red
  $errors += ".env.example"
}

# 6. Check implementation guide
Write-Host "Checking documentation..." -ForegroundColor Green
if (Test-Path "DAY_1_IMPLEMENTATION_GUIDE.md") {
  Write-Host "  OK - DAY_1_IMPLEMENTATION_GUIDE.md" -ForegroundColor Green
} else {
  Write-Host "  ERROR - DAY_1_IMPLEMENTATION_GUIDE.md MISSING" -ForegroundColor Red
  $errors += "DAY_1_IMPLEMENTATION_GUIDE.md"
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan

if ($errors.Count -eq 0) {
  Write-Host "SUCCESS - ALL FILES PRESENT AND CONFIGURED" -ForegroundColor Green
  Write-Host ""
  Write-Host "NEXT STEPS:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "1. Set up environment variables:" -ForegroundColor Yellow
  Write-Host "   Copy .env.example to .env.local and fill in GA4 & Sentry DSNs" -ForegroundColor Gray
  Write-Host ""
  Write-Host "2. Run TypeScript type-checker:" -ForegroundColor Yellow
  Write-Host "   npx tsc --noEmit" -ForegroundColor Gray
  Write-Host "   Fix any type errors (see DAY_1_IMPLEMENTATION_GUIDE.md)" -ForegroundColor Gray
  Write-Host ""
  Write-Host "3. Install Sentry SDK (if not done):" -ForegroundColor Yellow
  Write-Host "   npm install @sentry/nextjs" -ForegroundColor Gray
  Write-Host ""
  Write-Host "4. Start dev server:" -ForegroundColor Yellow
  Write-Host "   npm run dev" -ForegroundColor Gray
  Write-Host ""
  Write-Host "5. Test GA4 (in browser):" -ForegroundColor Yellow
  Write-Host "   - Go to GA4 Dashboard - Real-time" -ForegroundColor Gray
  Write-Host "   - Navigate pages - events should appear" -ForegroundColor Gray
  Write-Host ""
  Write-Host "6. Test Sentry (in browser console):" -ForegroundColor Yellow
  Write-Host "   throw new Error('Test Sentry error');" -ForegroundColor Gray
  Write-Host "   Check Sentry Dashboard - Issues" -ForegroundColor Gray
  Write-Host ""
  Write-Host "7. Commit and push:" -ForegroundColor Yellow
  Write-Host "   git add ." -ForegroundColor Gray
  Write-Host "   git commit -m 'feat: Day 1 Foundations - TS strict mode, GA4, Sentry'" -ForegroundColor Gray
  Write-Host "   git push origin feat/day-1-foundations" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Documentation: See DAY_1_IMPLEMENTATION_GUIDE.md" -ForegroundColor Cyan
  Write-Host ""
} else {
  Write-Host "ERROR - SETUP INCOMPLETE - MISSING FILES:" -ForegroundColor Red
  Write-Host ""
  foreach ($err in $errors) {
    Write-Host "   - $err" -ForegroundColor Red
  }
  Write-Host ""
  exit 1
}
