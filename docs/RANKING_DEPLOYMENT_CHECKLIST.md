# Product Ranking Engine - Deployment Checklist

## Pre-Deployment

### Database Setup
- [ ] Review migration files:
  - `20260308001_product_ranking_engine.sql` (main ranking system)
  - `20260308002_ranking_support_tables.sql` (support tables)
  
- [ ] Plan migration timing (during low-traffic period)

- [ ] Backup production database before running migrations

### Verification
- [ ] Confirm analytics_events table exists with proper structure
- [ ] Verify products table has: name, description, rating, review_count, is_active, created_at
- [ ] Check variants and order_items tables exist

---

## Deployment Steps

### 1. Run Migrations
```bash
# Option A: Via Supabase Dashboard
# - Go to SQL Editor
# - Copy migration 1 content
# - Execute
# - Copy migration 2 content  
# - Execute

# Option B: Via CLI
supabase migration up

# Verify
supabase db pull  # Should show new tables/views/functions
```

### 2. Environment Variables
Add to deployment platform (Vercel, Railway, etc.):
```env
RANKING_REFRESH_API_KEY=<generate_secure_key>
# Example: openssl rand -base64 32
```

Generate secure key:
```bash
openssl rand -base64 32
# Copy output to environment variable
```

### 3. Initial Ranking Refresh
```bash
# Manually trigger initial refresh
curl -X POST https://your-domain.com/api/admin/ranking/refresh \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# Should return success and product count
```

### 4. Enable Cron Job (Optional but Recommended)
Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/ranking/refresh",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Then redeploy:
```bash
git add vercel.json
git commit -m "Enable ranking refresh cron job"
git push
vercel --prod
```

---

## Post-Deployment Verification

### Check Database
```sql
-- 1. Verify materialized views exist
SELECT schemaname, matviewname 
FROM pg_matviews 
WHERE matviewname LIKE 'product_%';
-- Should return: product_ranking_view, product_trending_view

-- 2. Check ranking scores table
SELECT COUNT(*) FROM product_ranking_scores;
-- Should return: number of products

-- 3. Verify functions exist
SELECT proname FROM pg_proc 
WHERE proname LIKE 'get_ranked%' OR proname = 'refresh_product_ranking_scores'
ORDER BY proname;
-- Should return: get_product_ranking_details, get_ranked_products_by_category, 
--               get_trending_products, refresh_product_ranking_scores, 
--               search_products_with_ranking
```

### Test API Endpoints
```bash
# 1. Test search endpoint
curl "https://yourdomain.com/api/products/ranking/search?q=test&limit=5"

# 2. Test category endpoint (replace UUID)
curl "https://yourdomain.com/api/products/ranking/category?categoryId=UUID&limit=5&sortBy=ranking"

# 3. Test trending endpoint
curl "https://yourdomain.com/api/products/ranking/trending?limit=5"

# 4. Test product ranking details (replace UUID)
curl "https://yourdomain.com/api/products/UUID/ranking"

# 5. Test refresh endpoint
curl -X POST "https://yourdomain.com/api/admin/ranking/refresh" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Frontend Testing
- [ ] Visit category page - verify products load with ranking
- [ ] Test sort options - ensure all 5 sorts work:
  - Best Match (ranking)
  - Newest
  - Price: Low to High
  - Price: High to Low
  - Top Rated
  
- [ ] Test search - verify results appear ranked
- [ ] Test trending section - verify products appear
- [ ] Test pagination - ensure page navigation works
- [ ] Test filters (price range if implemented)

### Monitor Logs
```bash
# Check Vercel deployment logs
vercel logs --prod

# Check for errors in cron job (24h after deployment)
# Vercel dashboard → Crons tab → Check execution status
```

---

## Configuration

### Customize Signal Weights (Optional)
```sql
-- View current config
SELECT * FROM ranking_config;

-- Update purchase signal weight (default: 5)
UPDATE ranking_config
SET config_value = jsonb_set(
  config_value,
  '{signal_weights,purchase_weight}',
  '6'::jsonb
)
WHERE config_key = 'signal_weights';

-- Refresh to apply changes
SELECT refresh_product_ranking_scores();
```

### Adjust Refresh Interval (Optional)
Default: 30 minutes

Edit in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/ranking/refresh",
      "schedule": "*/15 * * * *"  // Every 15 minutes
    }
  ]
}
```

Cron format: `minute hour day month day_of_week`
- `*/30` = every 30 minutes
- `0 */2` = every 2 hours
- `0 2 * * *` = daily at 2 AM

---

## Monitoring & Health Checks

### Daily Monitoring
```sql
-- Check if rankings are fresh
SELECT INTO out_of_date_count COUNT(*) 
FROM product_ranking_scores
WHERE updated_at < NOW() - INTERVAL '35 minutes';
-- Should be 0
```

### Weekly Review
```sql
-- Get ranking statistics
SELECT * FROM get_ranking_statistics();

-- Check refresh logs
SELECT 
  COUNT(*) as total_refreshes,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  COUNT(*) FILTER (WHERE status = 'success') as succeeded,
  COUNT(*) FILTER (WHERE status = 'failure') as failed
FROM ranking_refresh_logs
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Monthly Optimization
```sql
-- Check query performance - run slow query analysis
EXPLAIN ANALYZE
SELECT * FROM get_ranked_products_by_category(
  'category-uuid', 24, 0, 'ranking'
);

-- Review index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE 'product_ranking%'
ORDER BY idx_scan DESC;
```

---

## Troubleshooting

### Cron Job Not Running
- [ ] Verify `vercel.json` has crons section
- [ ] Check Vercel dashboard → Crons tab
- [ ] Confirm RANKING_REFRESH_API_KEY is set
- [ ] Test endpoint manually:
  ```bash
  curl -X POST https://yourdomain.com/api/admin/ranking/refresh \
    -H "Authorization: Bearer YOUR_KEY"
  ```

### Stale Rankings
- [ ] Check refresh logs: `SELECT * FROM ranking_refresh_logs ORDER BY created_at DESC;`
- [ ] Manual refresh: `POST /api/admin/ranking/refresh`
- [ ] Check materialized views: `REFRESH MATERIALIZED VIEW product_ranking_view;`

### Slow Queries
- [ ] Check materialized view freshness
- [ ] Verify indexes exist:
  ```sql
  SELECT indexname FROM pg_indexes 
  WHERE tablename = 'product_ranking_scores';
  ```
- [ ] Analyze table: `ANALYZE product_ranking_scores;`

### Missing Products in Rankings
- [ ] Verify product is active: `SELECT is_active FROM products WHERE id = 'uuid';`
- [ ] Check for analytics data: `SELECT COUNT(*) FROM analytics_events WHERE product_id = 'uuid';`
- [ ] Run manual refresh: `SELECT refresh_product_ranking_scores();`

---

## Rollback Plan

If issues occur:

### Option 1: Quick Disable (1 minute)
```bash
# Remove cron from vercel.json
git checkout vercel.json  # or manually remove crons section
git push
# Cron stops immediately
```

### Option 2: Revert API (5 minutes)
```bash
# Revert API files to previous version
git revert commit-hash
git push
# Cron redirects to older endpoin (if kept)
```

### Option 3: Full Rollback (30 minutes)
```sql
-- DROP new views and tables (only if critical issues)
DROP MATERIALIZED VIEW IF EXISTS product_ranking_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS product_trending_view CASCADE;
DROP TABLE IF EXISTS product_ranking_scores CASCADE;
-- Keep ranking_config and ranking_refresh_logs for analysis
```

---

## Performance Baselines

Record these after deployment:

**Database:**
- Average refresh time: _____ ms
- Products in ranking: _____
- Storage used: _____

**API Response Times:**
- Category ranking: _____ ms
- Search + ranking: _____ ms  
- Trending: _____ ms

**Frontend:**
- Page load time with ranking: _____ ms
- Sort change delay: _____ ms
- Pagination load: _____ ms

---

## Success Criteria

✅ All tests passing:
- [ ] Database migrations complete
- [ ] All 5 RPC functions callable
- [ ] All 4 ranking API endpoints working
- [ ] Cron job executing every 30 minutes
- [ ] Frontend hooks rendering correctly
- [ ] Query performance under 500ms
- [ ] No error logs in 24 hours
- [ ] Products properly ranked by signals
- [ ] Sort options changing results correctly
- [ ] Trending section showing top 24-hour products

---

## Support & Debugging

### Resources
- Full documentation: `/docs/RANKING_ENGINE_GUIDE.md`
- Quick reference: `/docs/RANKING_QUICK_REFERENCE.md`
- Example component: `/src/components/examples/ShopWithRanking.tsx`
- Utilities: `/src/lib/ranking.ts`
- Hooks: `/src/hooks/useProductRanking.ts`

### Common Queries
```sql
-- View ranking formula for a product
SELECT * FROM get_product_ranking_details('product-uuid');

-- Top 10 products by ranking
SELECT product_id, ranking_score 
FROM product_ranking_scores 
ORDER BY ranking_score DESC LIMIT 10;

-- Products with zero sales
SELECT product_id, view_count, ranking_score
FROM product_ranking_scores
WHERE purchase_count = 0
ORDER BY view_count DESC;

-- Worst performing products
SELECT product_id, ranking_score, conversion_rate
FROM product_ranking_scores
ORDER BY ranking_score ASC LIMIT 10;
```

---

## Sign-Off

- [ ] Deployed by: _____________
- [ ] Date: _____________
- [ ] Verified by: _____________
- [ ] Notes: _____________

**Status: Ready for Production** ✅
