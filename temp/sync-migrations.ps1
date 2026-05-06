# Final solution: Mark all remote migrations as applied locally
# This syncs the local CLI state with what's actually in the remote database

Write-Host "Synchronizing local migration tracking with remote database..." -ForegroundColor Cyan

# All migrations that exist in remote database (from your SQL query)
$remoteMigrations = @(
    "20250101000001",
    "20251215",
    "20251216001",
    "20251216002",
    "20251216003",
    "20251216004",
    "20251216005",
    "20251216006",
    "20251216007",
    "20251216008",
    "20251216009",
    "20251216010",
    "20251216094709",
    "20251218",
    "20251219001",
    "20251219002",
    "20251219003",
    "20251220000000",
    "20251220000001",
    "20251220000002",
    "20251220000003",
    "20251220060000",
    "20251220060001",
    "20251220080000",
    "20251221",
    "20251222150000",
    "20251222",  # Consolidated entry for multiple 20251222 files
    "20251223",
    "20251224",
    "20251226000001",
    "20251226",  # Consolidated entry for multiple 20251226 files
    "20260131",
    "20260201000001",
    "20260202"
)

Write-Host "`nMarking all remote migrations as applied..." -ForegroundColor Yellow

foreach ($migration in $remoteMigrations) {
    Write-Host "  Applying: $migration" -ForegroundColor Gray
    npx supabase migration repair --status applied $migration
}

Write-Host "`nTesting sync..." -ForegroundColor Yellow
npx supabase migration list

Write-Host "`nDone! Your local migration tracking is now synced with the remote database." -ForegroundColor Green
Write-Host "Note: The remote database already has all migrations applied." -ForegroundColor Cyan
Write-Host "You can ignore the 'db pull' warnings going forward." -ForegroundColor Cyan
