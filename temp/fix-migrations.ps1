# Supabase Migration Repair Script - Detailed Fix
# Handles all duplicate migration entries

Write-Host "Starting detailed migration repair..." -ForegroundColor Cyan

# Step 1: Revert the consolidated remote entries first
Write-Host "`nStep 1: Reverting consolidated remote migrations..." -ForegroundColor Yellow
npx supabase migration repair --status reverted 20251222
npx supabase migration repair --status reverted 20251226

# Step 2: Apply each individual local migration file
Write-Host "`nStep 2: Applying all individual local migrations..." -ForegroundColor Yellow

$migrations = @(
    "20251222150000",
    "20251222_magic_checkout_fields",
    "20251222_stock_availability_permissions",
    "20251222_stock_availability_rpcs",
    "20251223",
    "20251224",
    "20251226000001",
    "20251226_create_categories_table",
    "20251226_create_size_charts",
    "20251226_create_user_sizebook",
    "20260131",
    "20260201000001",
    "20260202"
)

foreach ($migration in $migrations) {
    Write-Host "Applying: $migration" -ForegroundColor Gray
    npx supabase migration repair --status applied $migration
    Start-Sleep -Milliseconds 500
}

Write-Host "`nStep 3: Verifying sync..." -ForegroundColor Yellow
npx supabase db pull

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nMigration sync successful!" -ForegroundColor Green
}
else {
    Write-Host "`nMigration sync still has issues. Check output above." -ForegroundColor Red
}
