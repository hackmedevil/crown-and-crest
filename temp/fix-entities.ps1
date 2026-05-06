#!/usr/bin/env pwsh
# Batch fix React unescaped entities - replace all apostrophes with HTML entity

$files = @(
    "src/app/(admin)/admin/page.tsx",
    "src/app/(admin)/admin/settings/page.tsx",
    "src/app/(auth)/auth/forgot-password/ForgotPasswordClient.tsx",
    "src/app/(auth)/auth/steps/EmailStep.tsx",
    "src/app/(auth)/auth/steps/EnterStep.tsx",
    "src/app/(storefront)/cart/CartClient.tsx",
    "src/app/(storefront)/order/failure/OrderFailureClient.tsx",
    "src/app/(storefront)/product/[slug]/ProductDetailClient.tsx",
    "src/components/admin/products/ProductForm.tsx",
    "src/components/ErrorBoundary.tsx",
    "src/components/PhoneVerificationModal.tsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path "c:\Users\user\Desktop\Web App\crown-and-crest" $file
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw -Encoding UTF8
        # Fix unescaped apostrophes in JSX
        $content = $content -replace "([^\\])'([^s])", '$1&apos;$2'
        $content = $content -replace '([^\\])"([^s])', '$1&quot;$2'
        Set-Content $fullPath $content -NoNewline -Encoding UTF8
        Write-Host "Fixed: $file" -ForegroundColor Green
    }
}

Write-Host "Done fixing React entities!" -ForegroundColor Cyan
