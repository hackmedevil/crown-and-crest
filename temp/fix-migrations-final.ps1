# Final migration repair for duplicate timestamps
# The remote expects 3 entries each for 20251222 and 20251226

Write-Host "Running final repair for duplicate timestamp entries..." -ForegroundColor Cyan

# Apply 20251222 three times (for the 3 non-timestamped files with that date)
Write-Host "`nApplying 20251222 entries (3x)..." -ForegroundColor Yellow
npx supabase migration repair --status applied 20251222
npx supabase migration repair --status applied 20251222
npx supabase migration repair --status applied 20251222

# Apply 20251226 three times (for the 3 create files with that date)
Write-Host "`nApplying 20251226 entries (3x)..." -ForegroundColor Yellow
npx supabase migration repair --status applied 20251226
npx supabase migration repair --status applied 20251226
npx supabase migration repair --status applied 20251226

Write-Host "`nTesting db pull..." -ForegroundColor Yellow
npx supabase db pull

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCESS! Migration sync is complete!" -ForegroundColor Green
}
else {
    Write-Host "`nStill having issues. See output above." -ForegroundColor Red
}
