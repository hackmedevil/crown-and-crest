# Production Health Check Script
# Run this periodically during rollout to monitor site health

param(
    [Parameter(Mandatory=$true)]
    [string]$ProductionUrl
)

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$logFile = "temp/health-check-log.txt"

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "   Production Health Check" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Time: $timestamp" -ForegroundColor Gray
Write-Host "URL: $ProductionUrl" -ForegroundColor Gray
Write-Host ""

$pdpUrl = "$ProductionUrl/product/crown-crest-premium-plain-cotton-t-shirt-180-gsm-super-combed"

# Initialize results
$results = @{
    Timestamp = $timestamp
    IsUp = $false
    StatusCode = 0
    ResponseTime = 0
    CacheHeaders = $false
    ContentType = ""
}

# 1. Site Availability Check
Write-Host "[1/4] Checking site availability..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $pdpUrl -Method Head -TimeoutSec 10 -UseBasicParsing
    $results.StatusCode = $response.StatusCode
    
    if ($response.StatusCode -eq 200) {
        $results.IsUp = $true
        Write-Host "  ✅ Site is UP (Status: $($response.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ Unexpected status code: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Site is DOWN or unreachable" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# 2. Response Time Check
Write-Host ""
Write-Host "[2/4] Measuring response time..." -ForegroundColor Yellow
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
try {
    $response = Invoke-WebRequest -Uri $pdpUrl -TimeoutSec 30 -UseBasicParsing
    $stopwatch.Stop()
    $results.ResponseTime = $stopwatch.ElapsedMilliseconds
    
    if ($results.ResponseTime -lt 1000) {
        Write-Host "  ✅ Response time: $($results.ResponseTime)ms (Excellent)" -ForegroundColor Green
    } elseif ($results.ResponseTime -lt 2000) {
        Write-Host "  ✅ Response time: $($results.ResponseTime)ms (Good)" -ForegroundColor Green
    } elseif ($results.ResponseTime -lt 3000) {
        Write-Host "  ⚠️ Response time: $($results.ResponseTime)ms (Acceptable)" -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ Response time: $($results.ResponseTime)ms (Slow - investigate)" -ForegroundColor Red
    }
    
    # Check cache headers
    $cacheControl = $response.Headers['Cache-Control']
    if ($cacheControl) {
        $results.CacheHeaders = $true
        Write-Host "  ℹ️ Cache-Control: $cacheControl" -ForegroundColor Gray
    }
    
    # Check content type
    $contentType = $response.Headers['Content-Type']
    if ($contentType) {
        $results.ContentType = $contentType[0]
        Write-Host "  ℹ️ Content-Type: $($results.ContentType)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "  ❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Quick Content Check
Write-Host ""
Write-Host "[3/4] Verifying page content..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $pdpUrl -TimeoutSec 30 -UseBasicParsing
    $content = $response.Content
    
    $checks = @{
        "Product title present" = $content -match "Crown.*Crest|T-Shirt|Premium"
        "Next.js scripts loaded" = $content -match "_next/static"
        "No obvious errors" = $content -notmatch "500|Error|error|crash"
        "React hydration" = $content -match "__NEXT_DATA__|nextjs"
    }
    
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-Host "  ✅ $($check.Key)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ $($check.Key) - may need manual verification" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  ❌ Could not verify content: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Summary and Recommendations
Write-Host ""
Write-Host "[4/4] Health Summary" -ForegroundColor Yellow
Write-Host ""

$healthScore = 0
if ($results.IsUp) { $healthScore += 40 }
if ($results.ResponseTime -lt 2000) { $healthScore += 30 }
if ($results.ResponseTime -lt 1000) { $healthScore += 10 }
if ($results.CacheHeaders) { $healthScore += 10 }
if ($results.ContentType -match "text/html") { $healthScore += 10 }

Write-Host "Overall Health Score: $healthScore/100" -ForegroundColor $(
    if ($healthScore -ge 80) { "Green" } 
    elseif ($healthScore -ge 60) { "Yellow" } 
    else { "Red" }
)

if ($healthScore -ge 80) {
    Write-Host "Status: ✅ HEALTHY - Site performing well" -ForegroundColor Green
} elseif ($healthScore -ge 60) {
    Write-Host "Status: ⚠️ DEGRADED - Monitor closely" -ForegroundColor Yellow
} else {
    Write-Host "Status: ❌ UNHEALTHY - Immediate attention required" -ForegroundColor Red
}

# Log results
$logEntry = @"

[$timestamp]
Status: $(if ($results.IsUp) { "UP" } else { "DOWN" })
Response Time: $($results.ResponseTime)ms
Health Score: $healthScore/100

"@

$logEntry | Out-File -FilePath $logFile -Append

Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "Manual Checks Reminder:" -ForegroundColor Yellow
Write-Host "  1. Check hosting platform dashboard for:" -ForegroundColor White
Write-Host "     - Error rate trends" -ForegroundColor Gray
Write-Host "     - Memory/CPU usage" -ForegroundColor Gray
Write-Host "     - Request volume" -ForegroundColor Gray
Write-Host "  2. Review application logs for errors" -ForegroundColor White
Write-Host "  3. Check analytics dashboard:" -ForegroundColor White
Write-Host "     - Traffic volume vs baseline" -ForegroundColor Gray
Write-Host "     - Bounce rate" -ForegroundColor Gray
Write-Host "     - Conversion rate" -ForegroundColor Gray
Write-Host "  4. Monitor user feedback channels" -ForegroundColor White
Write-Host ""
Write-Host "Log saved to: $logFile" -ForegroundColor Gray
Write-Host "=======================================" -ForegroundColor Cyan
