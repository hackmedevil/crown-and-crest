# Ranking Engine Migration Steps

**Status**: Ready to Deploy  
**Date**: 2026-03-08  
**Prerequisites**: Supabase project with database access

## Overview

The ranking engine requires analytics infrastructure to function. This guide walks you through applying the migrations in the correct order.

## Migration Files (In Order)

### Step 1: Analytics Prerequisites
**File**: `supabase/migrations/20260308000_analytics_prerequisites.sql`

Creates foundation tables and functions:
- `analytics_events` - Tracks all product events (views, cart adds, purchases)
- `product_analytics` - Aggregated metrics per product
- `log_analytics_event()` - Function to log events
- `aggregate_product_analytics()` - Function to aggregate metrics

**What it does**:
- Creates analytics event tracking infrastructure
- Sets up indexes for fast queries
- Provides helper functions for logging and aggregation

### Step 2: Product Ranking Engine
**File**: `supabase/migrations/20260308001_product_ranking_engine.sql`

Creates ranking calculation system:
- `product_ranking_scores` - Pre-calculated ranking scores
- `product_ranking_view` - Materialized view with 6-signal ranking formula
- `product_trending_view` - 24-hour trending products

**Ranking Formula**:
```
ranking_score = 
  (purchase_count × 5) +
  (unique_user_views × 2) +
  (add_to_cart_count × 3) +
  (conversion_rate × 10) +
  (rating_score × 1.5) +
  recency_decay_boost +
  stock_score +
  bestseller_boost
```

### Step 3: Ranking Support Tables
**File**: `supabase/migrations/20260308002_ranking_support_tables.sql`

Additional supporting infrastructure:
- Background job tables
- Refresh scheduling
- Performance indexes

## Deployment Instructions

### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Navigate to project root
cd "c:/Users/user/Desktop/Web App/crown-and-crest"

# 2. Link to your Supabase project (if not already linked)
npx supabase link

# 3. Run migrations
npx supabase migration up

# 4. Verify deployment
npx supabase db list
```

### Option B: Using Supabase Web Console

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260308000_analytics_prerequisites.sql`
3. Run the query
4. Repeat for `20260308001_product_ranking_engine.sql`
5. Repeat for `20260308002_ranking_support_tables.sql`

### Option C: Manual PostgreSQL Connection

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"

# Run migrations (copy/paste file contents or use \i command)
\i supabase/migrations/20260308000_analytics_prerequisites.sql
\i supabase/migrations/20260308001_product_ranking_engine.sql
\i supabase/migrations/20260308002_ranking_support_tables.sql
```

## Verification Checklist

After migrations complete, verify:

- [ ] `analytics_events` table exists
  ```sql
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'analytics_events';
  ```

- [ ] `product_analytics` table exists
  ```sql
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'product_analytics';
  ```

- [ ] `product_ranking_scores` table exists
  ```sql
  SELECT COUNT(*) FROM information_schema.tables 
  WHERE table_name = 'product_ranking_scores';
  ```

- [ ] `product_ranking_view` materialized view exists
  ```sql
  SELECT COUNT(*) FROM information_schema.views 
  WHERE table_name = 'product_ranking_view';
  ```

- [ ] Helper functions exist
  ```sql
  SELECT count(*) FROM pg_proc 
  WHERE proname IN ('log_analytics_event', 'aggregate_product_analytics');
  -- Should return 2
  ```

## Initial Data Population

After migrations are applied:

### 1. Aggregate Existing Analytics
```sql
-- This populates product_analytics with existing event data
SELECT * FROM aggregate_product_analytics();
```

### 2. Refresh Ranking Scores
```sql
-- Insert initial rankings
INSERT INTO product_ranking_scores (
  product_id, 
  purchase_count, 
  view_count, 
  ranking_score,
  last_updated
)
SELECT 
  product_id,
  purchase_count,
  view_count,
  ranking_score,
  last_updated
FROM product_ranking_view
ON CONFLICT (product_id) 
DO UPDATE SET 
  purchase_count = EXCLUDED.purchase_count,
  view_count = EXCLUDED.view_count,
  ranking_score = EXCLUDED.ranking_score,
  last_updated = EXCLUDED.last_updated;
```

### 3. Test Ranking Query
```sql
-- View top 10 ranked products
SELECT 
  product_id,
  ranking_score,
  purchase_count,
  view_count,
  conversion_rate,
  rating_score
FROM product_ranking_view
ORDER BY ranking_score DESC
LIMIT 10;
```

## Application Integration

### 1. Frontend: Log Analytics Events

When users interact with products:

```typescript
// Log product view
const logEvent = async (eventType: string, productId: string) => {
  const response = await fetch('/api/analytics/log-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: eventType,
      product_id: productId,
      session_id: getSessionId(), // Your session tracking
      metadata: { /* custom data */ }
    })
  });
  return response.json();
};

// Usage:
// Log view
await logEvent('view_product', productId);

// Log cart add
await logEvent('add_to_cart', productId);
```

### 2. Backend: API Endpoint to Log Events

```typescript
// pages/api/analytics/log-event.ts
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { event_type, product_id, session_id, metadata } = req.body;

  const { data, error } = await supabase
    .rpc('log_analytics_event', {
      p_event_type: event_type,
      p_product_id: product_id,
      p_session_id: session_id,
      p_metadata: metadata
    });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ event_id: data });
}
```

### 3. Scheduled Refresh (Required Weekly)

Add to your cron jobs or scheduled tasks:

```typescript
// Refresh rankings every 6 hours
// Can be done via Vercel Cron, GitHub Actions, or Supabase Edge Function

export const refreshRankings = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/refresh-rankings`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    }
  );
  return response.json();
};
```

## Troubleshooting

### Issue: `analytics_events` table not found
**Solution**: Ensure `20260308000_analytics_prerequisites.sql` ran first

### Issue: `product_analytics` table not found
**Solution**: Run analytics aggregation
```sql
SELECT aggregate_product_analytics();
```

### Issue: Materialized view is slow
**Solution**: Refresh the view manually
```sql
REFRESH MATERIALIZED VIEW product_ranking_view;
REFRESH MATERIALIZED VIEW product_trending_view;
```

### Issue: Rankings not updating
**Solution**: Check migration execution order and verify helper functions

```sql
-- Check if functions exist
SELECT proname FROM pg_proc 
WHERE proname LIKE 'log_analytics_event%' 
OR proname LIKE 'aggregate_product%';
```

## Performance Notes

- **Analytics Events**: Indexes on (product_id, event_type, created_at) for fast aggregation
- **Ranking View**: Materialized view - refresh every 6 hours for optimal performance
- **Ranking Scores**: Pre-calculated table - allows real-time queries without computation

## Next Steps

1. ✅ Apply migrations (this guide)
2. 📊 Implement event logging in frontend
3. 🔄 Set up ranking refresh schedule
4. 📈 Monitor ranking quality with A/B testing
5. 🎯 Optimize weights in ranking formula based on real data

---

**Questions?** Check [RANKING_ENGINE_GUIDE.md](./RANKING_ENGINE_GUIDE.md) for API details
