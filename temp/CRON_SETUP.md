# Cron Job Configuration

## Setup Instructions

### 1. Generate CRON_SECRET

Generate a secure random token:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Add to Environment Variables

**Vercel (Production)**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add new variable:
   - Name: `CRON_SECRET`
   - Value: (paste your generated token)
   - Environment: Production, Preview, Development

**Local Development**:
Create/update `.env.local`:
```bash
CRON_SECRET=your-dev-secret-token-here
```

### 3. Deploy

The cron job will automatically activate after deployment with `vercel.json` present.

**Verify Configuration**:
```bash
# Check vercel.json exists in root
cat vercel.json

# Should show:
# {
#   "crons": [
#     {
#       "path": "/api/cron/cleanup-reservations",
#       "schedule": "*/10 * * * *"
#     }
#   ]
# }
```

## Testing

### Local Testing

```bash
# Start dev server
npm run dev

# Call endpoint manually
curl -X GET http://localhost:3000/api/cron/cleanup-reservations \
  -H "Authorization: Bearer your-dev-secret-token-here"
```

Expected response:
```json
{
  "success": true,
  "orders_processed": 0,
  "duration_ms": 123,
  "timestamp": "2025-12-16T10:00:00.000Z"
}
```

### Production Testing

After deployment, manually trigger the endpoint:

```bash
curl -X POST https://your-domain.com/api/cron/cleanup-reservations \
  -H "Authorization: Bearer YOUR_PRODUCTION_CRON_SECRET"
```

### Monitoring

**View Cron Logs in Vercel**:
1. Go to Vercel Dashboard → Project → Logs
2. Filter by `/api/cron/cleanup-reservations`
3. Look for `[Cleanup Job]` entries

**Expected log output**:
```
[Cleanup Job] Released reservations for 2 orders in 145ms
{
  timestamp: "2025-12-16T10:00:00.000Z",
  orders_processed: 2,
  duration_ms: 145
}
```

## Schedule Configuration

The cron job runs every 10 minutes using standard cron syntax:

```
*/10 * * * *
│   │ │ │ │
│   │ │ │ └── Day of week (0-7, 0 and 7 are Sunday)
│   │ │ └──── Month (1-12)
│   │ └────── Day of month (1-31)
│   └──────── Hour (0-23)
└──────────── Minute (0-59)
```

**To change frequency**, edit `vercel.json`:

- Every 5 minutes: `*/5 * * * *`
- Every 15 minutes: `*/15 * * * *`
- Every hour: `0 * * * *`
- Every 30 minutes: `*/30 * * * *`

## Troubleshooting

### Cron Not Running

**Check**:
1. `vercel.json` is in project root
2. `CRON_SECRET` is set in Vercel environment variables
3. Project is deployed to production (crons don't run in preview)

### Authorization Errors

**Symptoms**: Endpoint returns 401 Unauthorized

**Fix**:
1. Verify `CRON_SECRET` matches between Vercel env and request header
2. Ensure header format: `Authorization: Bearer YOUR_SECRET`
3. Check env variable is available in production (not just preview)

### RPC Errors

**Symptoms**: Endpoint returns 500, logs show "Cleanup RPC error"

**Fix**:
1. Verify `release_expired_reservations()` function exists in database
2. Check Supabase connection is healthy
3. Review Supabase logs for SQL errors
4. Test RPC directly in Supabase SQL Editor

## Security

- ✅ Endpoint requires `CRON_SECRET` for authorization
- ✅ Secret is stored as environment variable (not in code)
- ✅ Only Vercel Cron and manual triggers can call endpoint
- ✅ No user authentication required (server-to-server)
- ✅ No sensitive data returned in response

## References

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Syntax Reference](https://crontab.guru/)
- `INVENTORY_RESERVATION_FLOW.md` - Complete cleanup job documentation
