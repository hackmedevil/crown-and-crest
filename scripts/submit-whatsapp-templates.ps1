# WhatsApp Templates Submission Script
# Submits templates to Meta Business Manager via CLI

# Load environment variables
$envPath = '.env.local'
$envMap = @{}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^(?<k>[A-Z0-9_]+)=(?<v>.*)$') {
    $envMap[$matches.k] = $matches.v
  }
}

$token = ($envMap['WHATSAPP_ACCESS_TOKEN'] -replace '^"|"$', '').Trim()
$businessId = ($envMap['WHATSAPP_BUSINESS_ID'] -replace '^"|"$', '').Trim()

if (!$token -or !$businessId) {
  Write-Error "Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_BUSINESS_ID in .env.local"
  exit 1
}

$uri = "https://graph.facebook.com/v22.0/$businessId/message_templates"
$headers = @{
  'Authorization' = "Bearer $token"
  'Content-Type'  = 'application/json'
}

# Templates to submit
$templates = @(
  @{
    name     = "order_in_production"
    category = "UTILITY"
    language = "en_US"
    body     = @"
Your order is being prepared!

Order: #{{1}}

We're carefully crafting your items. You'll receive tracking details soon.

- Crown & Crest
"@
  },
  @{
    name     = "sent_to_logistics"
    category = "UTILITY"
    language = "en_US"
    body     = @"
Your order is sent for fulfillment!

Order: #{{1}}

You'll receive tracking details soon!

- Crown & Crest
"@
  },
  @{
    name     = "refund_initiated"
    category = "UTILITY"
    language = "en_US"
    body     = @"
Refund initiated!

Order: #{{1}}
Refund Amount: Rs.{{2}}

The amount will be credited to your original payment method within 5-7 business days.

- Crown & Crest
"@
  },
  @{
    name     = "order_cancelled"
    category = "UTILITY"
    language = "en_US"
    body     = @"
Your order has been cancelled.

Order: #{{1}}

If you have any questions, please contact our support team.

- Crown & Crest
"@
  }
)

Write-Host "Submitting WhatsApp Templates to Meta..." -ForegroundColor Green
Write-Host "Business ID: $businessId`n"

$successCount = 0
$failureCount = 0

foreach ($template in $templates) {
  Write-Host "Submitting: $($template.name)..." -ForegroundColor Cyan
  
  $payload = @{
    name       = $template.name
    category   = $template.category
    language   = $template.language
    components = @(
      @{
        type = "BODY"
        text = $template.body
      }
    )
  } | ConvertTo-Json -Depth 10

  try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $payload
    
    if ($response.id) {
      Write-Host "[SUCCESS] $($template.name)" -ForegroundColor Green
      Write-Host "   Template ID: $($response.id)" -ForegroundColor Green
      $successCount++
    } else {
      Write-Host "[FAILED] $($template.name)" -ForegroundColor Red
      Write-Host "   Response: $($response | ConvertTo-Json)" -ForegroundColor Red
      $failureCount++
    }
  }
  catch {
    Write-Host "[ERROR] $($template.name)" -ForegroundColor Red
    if ($_.ErrorDetails) {
      $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
      if ($errorDetails.error.message) {
        Write-Host "   Error: $($errorDetails.error.message)" -ForegroundColor Red
      } else {
        Write-Host "   Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
      }
    } else {
      Write-Host "   Error: $_" -ForegroundColor Red
    }
    $failureCount++
  }
  
  Start-Sleep -Milliseconds 500
}

Write-Host "`n" -ForegroundColor White
Write-Host "===================================" -ForegroundColor White
Write-Host "Summary:" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failureCount" -ForegroundColor Red
Write-Host "===================================" -ForegroundColor White

if ($failureCount -eq 0) {
  Write-Host "`nAll templates submitted successfully!" -ForegroundColor Green
  Write-Host "Templates will be reviewed by Meta (typically 1-2 hours)" -ForegroundColor Green
} else {
  Write-Host "`nSome templates failed. Check the errors above." -ForegroundColor Yellow
  exit 1
}
