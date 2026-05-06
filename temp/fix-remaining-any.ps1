# Comprehensive script to fix all remaining explicit any types with safe alternatives

$anyPatternsToFix = @(
    # Function parameters
    @{Find = 'params: any'; Replace = 'params: Record<string, unknown>' },
    @{Find = 'data: any'; Replace = 'data: Record<string, unknown>' },
    @{Find = 'payload: any'; Replace = 'payload: Record<string, unknown>' },
    @{Find = 'entity: any'; Replace = 'entity: Record<string, unknown>' },
    @{Find = 'response: any'; Replace = 'response: Record<string, unknown>' },
    @{Find = 'result: any'; Replace = 'result: unknown' },
    @{Find = 'value: any'; Replace = 'value: unknown' },
    @{Find = 'config: any'; Replace = 'config: Record<string, unknown>' },
    @{Find = 'options: any'; Replace = 'options: Record<string, unknown>' },
    @{Find = 'metadata: any'; Replace = 'metadata: Record<string, unknown>' }
)

$files = Get-ChildItem -Path "src" -Recurse -Include *.ts, *.tsx | Where-Object {
    $_.FullName -notlike "*node_modules*"
}

$totalFixed = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    foreach ($pattern in $anyPatternsToFix) {
        if ($content -match [regex]::Escape($pattern.Find)) {
            $content = $content -replace [regex]::Escape($pattern.Find), $pattern.Replace
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content $file.FullName $content -NoNewline -Encoding UTF8
        $totalFixed++
        Write-Host "Fixed: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nFixed $totalFixed files" -ForegroundColor Cyan
