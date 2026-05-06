# Apply Products Metadata Migration
# Purpose: Extend products table with badge, ranking, and analytics columns
# Created: 2026-03-08

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Products Schema Extension - Migration" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if migration file exists
$migrationFile = "supabase\migrations\20260308006_extend_products_metadata.sql"
$verificationFile = "scripts\verify-products-schema.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Migration file found" -ForegroundColor Green
Write-Host "📄 File: $migrationFile`n" -ForegroundColor Gray

# Display what will be added
Write-Host "This migration will add:" -ForegroundColor Yellow
Write-Host "  • 7 new columns (is_new, is_bestseller, is_on_sale, view_count, purchase_count, wishlist_count, ranking_score)" -ForegroundColor White
Write-Host "  • 7 performance indexes" -ForegroundColor White
Write-Host "  • 4 check constraints" -ForegroundColor White
Write-Host "  • Auto-mark products from last 30 days as 'new'`n" -ForegroundColor White

Write-Host "⚠️  This migration is safe for production:" -ForegroundColor Yellow
Write-Host "  • No existing columns modified" -ForegroundColor White
Write-Host "  • No data loss" -ForegroundColor White
Write-Host "  • Uses IF NOT EXISTS for idempotency`n" -ForegroundColor White

# Ask for confirmation
$confirmation = Read-Host "Apply migration to Supabase? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "`n❌ Migration cancelled" -ForegroundColor Red
    exit 0
}

Write-Host "`n📊 To apply this migration, run ONE of these methods:`n" -ForegroundColor Cyan

Write-Host "METHOD 1: Supabase Dashboard (Recommended)" -ForegroundColor Yellow
Write-Host "  1. Open Supabase Dashboard → SQL Editor" -ForegroundColor White
Write-Host "  2. Copy content from: $migrationFile" -ForegroundColor White
Write-Host "  3. Paste and click 'Run'`n" -ForegroundColor White

Write-Host "METHOD 2: Supabase CLI" -ForegroundColor Yellow
Write-Host "  supabase db push`n" -ForegroundColor Gray

Write-Host "METHOD 3: Direct SQL (if you have psql)" -ForegroundColor Yellow
Write-Host "  psql -h <your-db-host> -U postgres -d postgres -f $migrationFile`n" -ForegroundColor Gray

Write-Host "========================================`n" -ForegroundColor Cyan

# Offer to open migration file
$openFile = Read-Host "Open migration file in editor? (y/N)"
if ($openFile -eq 'y' -or $openFile -eq 'Y') {
    code $migrationFile
}

Write-Host "`n✅ After applying migration, verify schema with:" -ForegroundColor Green
Write-Host "   supabase db execute -f $verificationFile" -ForegroundColor Gray
Write-Host "   OR" -ForegroundColor Gray
Write-Host "   Run queries from $verificationFile in SQL Editor`n" -ForegroundColor Gray

Write-Host "========================================`n" -ForegroundColor Cyan
