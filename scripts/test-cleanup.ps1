# Test script for inventory cleanup cron job (PowerShell)
# Usage: .\test-cleanup.ps1 -Environment local
# Usage: .\test-cleanup.ps1 -Environment production -ProductionUrl "https://your-domain.com"

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('local', 'production')]
    [string]$Environment = 'local',
    
    [Parameter(Mandatory=$false)]
    [string]$ProductionUrl = '',
    
    [Parameter(Mandatory=$false)]
    [string]$CronSecret = $env:CRON_SECRET
)

$ErrorActionPreference = 'Stop'

# Determine URL and secret
if ($Environment -eq 'local') {
    $url = 'http://localhost:3000/api/cron/cleanup-reservations'
    if (-not $CronSecret) {
        $CronSecret = 'dev-secret-123'
    }
    Write-Host "Testing LOCAL endpoint: $url" -ForegroundColor Cyan
} elseif ($Environment -eq 'production') {
    if (-not $ProductionUrl) {
        Write-Host "Error: ProductionUrl parameter required for production testing" -ForegroundColor Red
        Write-Host "Usage: .\test-cleanup.ps1 -Environment production -ProductionUrl 'https://your-domain.com'"
        exit 1
    }
    $url = "$ProductionUrl/api/cron/cleanup-reservations"
    if (-not $CronSecret) {
        Write-Host "Error: CRON_SECRET environment variable not set" -ForegroundColor Red
        exit 1
    }
    Write-Host "Testing PRODUCTION endpoint: $url" -ForegroundColor Cyan
}

$secretPreview = $CronSecret.Substring(0, [Math]::Min(10, $CronSecret.Length))
Write-Host "Using Authorization: Bearer $secretPreview..." -ForegroundColor Gray
Write-Host ""

# Prepare headers
$headers = @{
    'Authorization' = "Bearer $CronSecret"
    'Content-Type' = 'application/json'
}

try {
    # Make request
    $response = Invoke-WebRequest -Uri $url -Method Get -Headers $headers -UseBasicParsing
    
    Write-Host "Response status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response body:"
    
    # Parse JSON
    $body = $response.Content | ConvertFrom-Json
    $body | ConvertTo-Json -Depth 10
    
    Write-Host ""
    Write-Host "✅ Cleanup job executed successfully" -ForegroundColor Green
    
    # Display metrics
    Write-Host "📊 Metrics:" -ForegroundColor Cyan
    Write-Host "   Orders processed: $($body.orders_processed)"
    Write-Host "   Duration: $($body.duration_ms)ms"
    
} catch {
    Write-Host ""
    Write-Host "❌ Cleanup job failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status code: $statusCode" -ForegroundColor Red
        
        # Try to read error response
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error body: $errorBody" -ForegroundColor Red
        } catch {
            # Ignore error reading response
        }
    }
    
    exit 1
}
