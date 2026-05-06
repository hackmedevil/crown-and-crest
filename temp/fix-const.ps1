#!/usr/bin/env pwsh
# Script to batch-fix common ESLint errors

# Fix prefer-const violations
Write-Host "Fixing prefer-const violations..." -ForegroundColor Yellow
Get-ChildItem -Path "src" -Recurse -Include *.ts,*.tsx | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    # Basic let to const replacement (safe patterns)
    $content = $content -replace 'let\s+(availabilityMap|stockFlagsMap|recommendationContext)\s*=','const $1 ='
    Set-Content $_.FullName $content -NoNewline
}

Write-Host "Done!" -ForegroundColor Green
