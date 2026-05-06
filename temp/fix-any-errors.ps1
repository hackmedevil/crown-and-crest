# Fast batch script to add unknown type for remaining any types
# This will convert remaining explicit any to unknown as a safe default

$replacements = @{
    'error: any'         = 'error: unknown'
    'catch (error: any)' = 'catch (error: unknown)'
    'catch (err: any)'   = 'catch (err: unknown)'
    'catch (e: any)'     = 'catch (e: unknown)'
}

$files = Get-ChildItem -Path "src" -Recurse -Include *.ts, *.tsx | Where-Object {
    $_.FullName -notlike "*node_modules*"
}

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $modified = $false
    
    foreach ($find in $replacements.Keys) {
        if ($content -match [regex]::Escape($find)) {
            $content = $content -replace [regex]::Escape($find), $replacements[$find]
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content $file.FullName $content -NoNewline -Encoding UTF8
        $count++
        Write-Host "Fixed: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nFixed $count files" -ForegroundColor Cyan
