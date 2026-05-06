# Submit corrected WhatsApp templates via Meta API

$token = "EAAe1i79rYaUBRC6YpJtwD9rPs2g0ADimcwZBsyiFnPxoRqP83Xc1Cg49Fjwm9xbMAbbXULbz0i0TMtdf6RJ7H0csXZAyhcf5ZAqMIzJXlyJrcUYBCdnFSNkTZAOhUfeqnXEHMhAEUHOEMlgDFh8JUfEvPZBUZA0kbRyk3CFR83PAiHPSb1a9EvTsugQZCL0TrQRTZCWc8hsP0b0ksfRwJBOZAe8IA9CWuW22BZAjg1cipVLOZAxQA10dxhv5cFmWOGlzUiJKOPhR7JINZC1Un6znZCYkLehZCncSalWV7kVAZDZD"
$businessId = "1621027432379090"
$uri = "https://graph.facebook.com/v22.0/$businessId/message_templates"

$templates = @(
    @{
        name = "order_in_production"
        body = "Your order is being prepared!`n`nOrder: #{{1}}`n`nWe're carefully crafting your items. You'll receive tracking details soon.`n`n- Crown & Crest"
    }
    @{
        name = "sent_to_logistics"
        body = "Your order is sent for fulfillment!`n`nOrder: #{{1}}`n`nYou'll receive tracking details soon!`n`n- Crown & Crest"
    }
    @{
        name = "refund_initiated"
        body = "Refund initiated!`n`nOrder: #{{1}}`nRefund Amount: Rs.{{2}}`n`nThe amount will be credited to your original payment method within 5-7 business days.`n`n- Crown & Crest"
    }
    @{
        name = "order_cancelled"
        body = "Your order has been cancelled.`n`nOrder: #{{1}}`n`nIf you have any questions, please contact our support team.`n`n- Crown & Crest"
    }
)

Write-Host "Submitting WhatsApp Templates..." -ForegroundColor Green

$successCount = 0
$failedCount = 0

foreach ($template in $templates) {
    Write-Host "Submitting: $($template.name)..." -ForegroundColor Cyan
    
    $payload = @{
        name = $template.name
        category = "UTILITY"
        language = "en_US"
        components = @(
            @{
                type = "BODY"
                text = $template.body
            }
        )
    }
    
    $jsonPayload = $payload | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $uri `
            -Method POST `
            -Headers @{
                "Authorization" = "Bearer $token"
                "Content-Type" = "application/json"
            } `
            -Body $jsonPayload
        
        if ($response.id) {
            Write-Host "SUCCESS - ID: $($response.id)" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "FAILED - No ID in response" -ForegroundColor Red
            $failedCount++
        }
    }
    catch {
        Write-Host "ERROR - $($_.Exception.Message)" -ForegroundColor Red
        $failedCount++
    }
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`nSummary: $successCount successful, $failedCount failed" -ForegroundColor White
