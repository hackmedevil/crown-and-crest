# Inventory Reservation Integration - Razorpay Checkout Flow

## Overview

This document describes the integration of inventory reservation into the Razorpay checkout flow, ensuring atomic stock management and preventing overselling.

## Architecture

### Key Components

1. **Stock Reservation RPCs** (`supabase/migrations/20251216_stock_reservations_rpcs.sql`)
   - `reserve_stock(order_id, uid, items_json, ttl_seconds)`: Atomically reserves stock
   - `commit_reservation(order_id)`: Finalizes reservation on payment success
   - `release_reservation(order_id)`: Releases stock on cancellation/failure

2. **Inventory Actions** (`src/lib/inventory/actions.ts`)
   - Server actions wrapping RPC calls
   - Type-safe interfaces with error handling

3. **Checkout Flow** (`src/app/api/razorpay/`)
   - `/api/razorpay` (POST): Order creation + stock reservation
   - `/api/razorpay/verify` (POST): Payment verification + reservation commit
   - `/api/razorpay/cancel` (POST): Payment cancellation + reservation release

4. **Cleanup Job** (`src/app/api/cron/cleanup-reservations/`)
   - Scheduled via Vercel Cron (runs every 10 minutes)
   - Calls `release_expired_reservations()` RPC
   - Automatically releases expired reservations
   - Restores stock for abandoned checkouts

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Clicks "Pay Now"                                        │
│    - CheckoutClient fetches cart                                │
│    - Calls POST /api/razorpay with total amount                 │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Order Creation + Stock Reservation                           │
│    - Create order in DB (status: CREATED)                       │
│    - Call reserve_stock RPC with order_id + cart items          │
│      • Atomically decrements stock_quantity                     │
│      • Creates reservation records (status: reserved)           │
│      • Sets 15-minute expiry                                    │
│    - If OUT_OF_STOCK: abort, delete order, return error         │
│    - If success: create Razorpay order, update status to        │
│      PAYMENT_PENDING                                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Razorpay Modal Opens                                         │
│    - User sees payment options (UPI, Card, etc.)                │
│    - Stock is HELD for 15 minutes                               │
└──────────┬───────────────────────────┬──────────────────────────┘
           ▼                           ▼
┌──────────────────────┐    ┌───────────────────────────────────┐
│ 4a. Payment Success  │    │ 4b. Payment Cancelled/Failed      │
│ - Verify signature   │    │ - User closes modal OR            │
│ - Update order:      │    │ - Payment fails                   │
│   PAID               │    │                                   │
│ - Commit             │    │ - Call POST /api/razorpay/cancel  │
│   reservations       │    │ - Release reservations            │
│   (mark committed)   │    │   • Restore stock_quantity        │
│ - Redirect to order  │    │   • Mark status: released         │
│   success            │    │ - Update order: CANCELLED/FAILED  │
└──────────────────────┘    └───────────────────────────────────┘
```

## API Endpoints

### POST /api/razorpay

**Purpose**: Create order and reserve inventory

**Request**:
```json
{
  "amount": 5000
}
```

**Success Response** (200):
```json
{
  "orderId": "uuid",
  "razorpayOrderId": "order_abc123",
  "amount": 5000
}
```

**Error Responses**:
- `400` - Cart is empty
- `409` - OUT_OF_STOCK (one or more items unavailable)
- `500` - Order creation or reservation failed

**Flow**:
1. Fetch user's cart items
2. Create order in DB (status: CREATED)
3. Call `reserve_stock` RPC with all cart items
   - If OUT_OF_STOCK: delete order, return error
4. Create Razorpay order
5. Update order status to PAYMENT_PENDING
6. Return order IDs to client

**Rollback on Error**:
- Releases any partial reservations
- Deletes order record
- Returns error to client

---

### POST /api/razorpay/verify

**Purpose**: Verify payment and commit reservations

**Request**:
```json
{
  "razorpay_order_id": "order_abc123",
  "razorpay_payment_id": "pay_xyz789",
  "razorpay_signature": "signature_hash",
  "orderId": "uuid"
}
```

**Success Response** (200):
```json
{
  "success": true
}
```

**Error Responses**:
- `400` - Invalid payment signature (releases reservations, marks order FAILED)
- `404` - Order not found
- `409` - Order already processed

**Flow**:
1. Fetch order from DB
2. Idempotent check: if already PAID, return success
3. Verify Razorpay signature
   - If invalid: release reservations, mark FAILED
4. Atomic update: set status to PAID (with PAYMENT_PENDING guard)
5. Commit reservations (mark as 'committed')

**Safety**:
- Uses `.eq('status', 'PAYMENT_PENDING')` guard to prevent double-processing
- Signature verification before any state changes
- Releases stock if signature fails

---

### POST /api/razorpay/cancel

**Purpose**: Cancel order and release reservations

**Request**:
```json
{
  "orderId": "uuid"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Order cancelled and reservations released"
}
```

**Error Responses**:
- `400` - Order cannot be cancelled in current state
- `404` - Order not found

**Flow**:
1. Fetch order and verify user ownership
2. Check status: only cancel if PAYMENT_PENDING or CREATED
3. Release reservations (restore stock_quantity)
4. Update order status to CANCELLED

**Triggered By**:
- User closes Razorpay modal (`modal.ondismiss` callback)
- Payment timeout (future: cron job)

---

## Database Schema

### stock_reservations Table

```sql
CREATE TABLE stock_reservations (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  variant_id uuid NOT NULL REFERENCES variants(id),
  user_uid text,
  quantity integer NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved','released','committed')),
  reserved_at timestamptz NOT NULL,
  expires_at timestamptz,
  
  UNIQUE (order_id, variant_id, status)
);
```

**Status Flow**:
- `reserved` → Initial state after `reserve_stock`
- `committed` → Final state after payment success
- `released` → Final state after cancellation/failure

**Indexes**:
- `idx_stock_reservations_order`: Fast lookup by order
- `idx_stock_reservations_variant`: Fast lookup by variant
- `idx_stock_reservations_expires`: Cleanup of expired reservations

---

## Safety Guarantees

### 1. Atomicity

**All-or-Nothing Reservation**:
```sql
-- In reserve_stock RPC
UPDATE variants v
SET stock_quantity = v.stock_quantity - i.qty
FROM items i
WHERE v.id = i.variant_id
  AND v.stock_quantity >= i.qty  -- ✅ Stock check
RETURNING v.id;

-- If ANY item has insufficient stock, entire transaction rolls back
IF requested_count <> updated_count THEN
  RAISE EXCEPTION 'OUT_OF_STOCK';
END IF;
```

### 2. Idempotency

**Commit Reservation** (safe to call multiple times):
```sql
UPDATE stock_reservations
SET status = 'committed'
WHERE order_id = p_order_id
  AND status = 'reserved';  -- ✅ Only updates if still reserved

-- If already committed, affected = 0 (raises exception for safety)
```

**Verify Handler** (prevents double-processing):
```sql
UPDATE orders
SET status = 'PAID'
WHERE id = orderId
  AND status = 'PAYMENT_PENDING'  -- ✅ Status guard
```

### 3. Never Commit After Release

**Mutual Exclusion**:
- `reserve_stock`: Creates records with status = 'reserved'
- `commit_reservation`: Updates WHERE status = 'reserved'
- `release_reservation`: Updates WHERE status = 'reserved'

Once a reservation is released or committed, it cannot transition to the other state.

### 4. Never Release After Commit

**Commit is Final**:
- Payment verification checks `order.status === 'PAID'` first (hard stop)
- Cancellation endpoint rejects if status is 'PAID'
- Ensures committed inventory is never restored

---

## Error Handling

### Checkout Flow Errors

| Scenario | Action | User Message |
|----------|--------|--------------|
| Cart empty | Abort | "Cart is empty" |
| OUT_OF_STOCK | Delete order, abort | "One or more items are out of stock" |
| Reservation failed | Delete order, release stock | "Checkout failed, please try again" |
| Razorpay order fails | Release reservations, delete order | "Payment setup failed" |

### Verification Errors

| Scenario | Action | User Message |
|----------|--------|--------------|
| Invalid signature | Release reservations, mark FAILED | "Invalid payment signature" |
| Order not found | Return 404 | "Order not found" |
| Already PAID | Return success | "Order already paid" |
| Wrong status | Return 409 | "Order already processed" |

### Cancellation Errors

| Scenario | Action | User Message |
|----------|--------|--------------|
| Already PAID | Reject | "Order already paid, cannot cancel" |
| Already CANCELLED | Return success | "Order already cancelled" |
| Wrong status | Reject | "Order cannot be cancelled" |

---

## Client Integration

### CheckoutClient.tsx

**Modal Dismissal Handler**:
```typescript
modal: {
  ondismiss: async () => {
    // User closed Razorpay without completing payment
    await fetch('/api/razorpay/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: dbOrderId }),
    })
    setIsPaying(false)
  }
}
```

**OUT_OF_STOCK Handling**:
```typescript
const order = await fetch('/api/razorpay', {
  method: 'POST',
  body: JSON.stringify({ amount: totalAmount }),
}).then(res => res.json())

if (order.error === 'OUT_OF_STOCK') {
  alert('One or more items in your cart are out of stock')
  return
}
```

---

## Future Enhancements

### 1. ✅ Expired Reservation Cleanup (IMPLEMENTED)

**Status**: ✅ Complete  
**Implementation**: Vercel Cron job running every 10 minutes  
**Endpoint**: `/api/cron/cleanup-reservations`  
**Configuration**: `vercel.json`

See "Automatic Cleanup Job" section above for full details.

### 2. Order Items Table

**Current**: Reservations link to cart items implicitly  
**Future**: Create `order_items` table to snapshot cart at order time

```sql
CREATE TABLE order_items (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES orders(id),
  product_id uuid REFERENCES products(id),
  variant_id uuid REFERENCES variants(id),
  quantity integer,
  price_at_purchase numeric,
  created_at timestamptz
);
```

**Benefits**:
- Preserve historical pricing
- Decouple from cart table
- Enable order history queries

### 3. Reservation Monitoring

**Admin Dashboard**:
- Active reservations count
- Expired reservations needing cleanup
- Failed reservation attempts (out of stock events)

### 4. Stock Alerts

**Low Stock Warnings**:
- Trigger when `stock_quantity < low_stock_threshold`
- Email admin when variant is nearly out of stock
- Auto-disable variant when stock hits 0

---

## Testing Checklist

### Happy Path
- ✅ Create order with in-stock items
- ✅ Verify stock is decremented
- ✅ Complete payment
- ✅ Verify reservations committed
- ✅ Verify order marked PAID

### Out of Stock
- ✅ Attempt checkout with out-of-stock item
- ✅ Verify error returned: OUT_OF_STOCK
- ✅ Verify order NOT created
- ✅ Verify stock unchanged

### Payment Cancellation
- ✅ Create order
- ✅ Close Razorpay modal without paying
- ✅ Verify stock restored
- ✅ Verify order marked CANCELLED

### Payment Failure
- ✅ Provide invalid payment details
- ✅ Verify reservations released
- ✅ Verify order marked FAILED

### Edge Cases
- ✅ Double-submit payment verification (idempotent)
- ✅ Verify already-paid order (no-op)
- ✅ Concurrent checkouts on same variant (atomic reserve)
- ✅ Partial stock (all-or-nothing behavior)

---

## Troubleshooting

### Reservations Not Released

**Symptom**: Stock appears locked after cancelled payment

**Diagnosis**:
```sql
SELECT * FROM stock_reservations 
WHERE status = 'reserved' 
  AND expires_at < now();
```

**Fix**: Run cleanup manually
```sql
SELECT release_expired_reservations();
```

### Stock Discrepancy

**Symptom**: `stock_quantity` doesn't match expected value

**Diagnosis**:
```sql
-- Check reservation totals
SELECT 
  variant_id,
  status,
  SUM(quantity) as total
FROM stock_reservations
GROUP BY variant_id, status;

-- Compare with variants table
SELECT id, stock_quantity FROM variants;
```

**Fix**: Run inventory audit (future admin tool)

### Order Stuck in PAYMENT_PENDING

**Symptom**: Order status never updated after payment

**Diagnosis**:
- Check if verify endpoint was called
- Check Razorpay webhook logs
- Check order status in DB

**Fix**: Manually commit reservation if payment confirmed in Razorpay dashboard

---

## Automatic Cleanup Job

### Overview

The cleanup job automatically releases expired inventory reservations that were not completed or cancelled. This prevents inventory from being locked indefinitely when users abandon checkout without closing the Razorpay modal.

### Implementation

**Endpoint**: `GET/POST /api/cron/cleanup-reservations`  
**Schedule**: Every 10 minutes (Vercel Cron)  
**Configuration**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-reservations",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

### How It Works

1. **Trigger**: Vercel Cron automatically calls the endpoint every 10 minutes
2. **Authentication**: Endpoint verifies `CRON_SECRET` bearer token
3. **Execution**: Calls `release_expired_reservations()` RPC
4. **Logging**: Logs number of orders processed and execution time
5. **Response**: Returns JSON with success status and metrics

### RPC Logic

The `release_expired_reservations()` function:

```sql
-- Finds all orders with expired reservations
SELECT DISTINCT order_id
FROM stock_reservations
WHERE status = 'reserved' 
  AND expires_at <= now()

-- For each order, calls release_reservation(order_id)
-- This:
-- 1. Restores stock_quantity to variants
-- 2. Marks reservations as 'released'
-- 3. Returns count of affected rows
```

### Safety Features

✅ **Idempotent**: Safe to run multiple times  
✅ **Status guard**: Only affects reservations with status = 'reserved'  
✅ **Never touches committed**: Ignores reservations for paid orders  
✅ **Never touches released**: Skips already-released reservations  
✅ **Protected endpoint**: Requires CRON_SECRET for authorization

### Environment Setup

**Required Environment Variable**:
```bash
CRON_SECRET=your-random-secret-token-here
```

**Vercel Configuration**:
1. Add `CRON_SECRET` to Vercel Environment Variables
2. Deploy with `vercel.json` in root directory
3. Cron will activate automatically on production

### Response Format

**Success**:
```json
{
  "success": true,
  "orders_processed": 3,
  "duration_ms": 142,
  "timestamp": "2025-12-16T10:30:00.000Z"
}
```

**Error**:
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-12-16T10:30:00.000Z"
}
```

### Logging

The cleanup job logs to console with structured data:

```
[Cleanup Job] Released reservations for 3 orders in 142ms
{
  timestamp: "2025-12-16T10:30:00.000Z",
  orders_processed: 3,
  duration_ms: 142
}
```

**Monitor these logs in Vercel Dashboard → Logs**

### Manual Triggering

For testing or emergency cleanup:

```bash
# Manual trigger via HTTP request
curl -X POST https://your-domain.com/api/cron/cleanup-reservations \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Use Cases**:
- Testing in development
- Emergency cleanup after system issues
- One-time cleanup of old data

### Monitoring & Observability

#### Key Metrics to Track

1. **Orders Processed**: Number of orders with expired reservations
   - Normal: 0-5 per run (users abandoning checkout)
   - High: >10 per run (may indicate UX issues)

2. **Execution Time**: Duration of cleanup job
   - Normal: <500ms
   - Slow: >2s (may indicate DB performance issues)

3. **Failure Rate**: Failed cleanup attempts
   - Normal: 0%
   - Alert: >5% (investigate RPC or DB issues)

#### Vercel Dashboard Monitoring

**View Logs**:
1. Go to Vercel Dashboard → Project → Logs
2. Filter by `/api/cron/cleanup-reservations`
3. Look for `[Cleanup Job]` prefix

**View Cron Runs**:
1. Go to Vercel Dashboard → Project → Cron Jobs
2. See execution history and success/failure status
3. View timing and response codes

#### Database Monitoring

**Check Expired Reservations**:
```sql
-- Count of currently expired reservations
SELECT COUNT(*) 
FROM stock_reservations 
WHERE status = 'reserved' 
  AND expires_at <= now();
```

**Recent Cleanup Activity**:
```sql
-- Reservations released in last hour
SELECT 
  order_id,
  variant_id,
  quantity,
  expires_at,
  reserved_at
FROM stock_reservations
WHERE status = 'released'
  AND expires_at > now() - interval '1 hour'
ORDER BY expires_at DESC;
```

### Failure Recovery

#### Scenario 1: Cron Job Fails

**Symptoms**: Logs show errors, stock appears locked

**Diagnosis**:
```bash
# Check Vercel logs for errors
# Look for RPC errors or DB connection issues
```

**Recovery**:
1. Check `CRON_SECRET` is configured
2. Verify Supabase connection is healthy
3. Manually trigger endpoint to release backlog
4. If persistent, check RPC function for errors

#### Scenario 2: RPC Fails

**Symptoms**: Endpoint returns 500, no reservations released

**Diagnosis**:
```sql
-- Test RPC directly
SELECT release_expired_reservations();
```

**Recovery**:
1. Check for DB locks or performance issues
2. Verify RPC function exists and is valid
3. Check for data integrity issues (orphaned reservations)
4. Run manual cleanup queries if needed

#### Scenario 3: Backlog of Expired Reservations

**Symptoms**: Large number of expired reservations accumulating

**Diagnosis**:
```sql
-- Count by age
SELECT 
  CASE 
    WHEN expires_at > now() - interval '1 hour' THEN '< 1 hour'
    WHEN expires_at > now() - interval '24 hours' THEN '1-24 hours'
    ELSE '> 24 hours'
  END as age_bucket,
  COUNT(*) as count
FROM stock_reservations
WHERE status = 'reserved'
  AND expires_at <= now()
GROUP BY age_bucket;
```

**Recovery**:
1. Manually trigger cleanup multiple times
2. Increase cron frequency temporarily (e.g., every 5 minutes)
3. Investigate root cause (cron stopped? DB issues?)
4. After backlog cleared, return to normal schedule

### Emergency Manual Cleanup

If automated cleanup fails, use these SQL queries:

```sql
-- EMERGENCY: Release ALL expired reservations manually
DO $$
DECLARE
  order_row RECORD;
BEGIN
  FOR order_row IN (
    SELECT DISTINCT order_id
    FROM stock_reservations
    WHERE status = 'reserved' AND expires_at <= now()
  ) LOOP
    PERFORM release_reservation(order_row.order_id);
  END LOOP;
END $$;

-- Verify cleanup succeeded
SELECT COUNT(*) 
FROM stock_reservations 
WHERE status = 'reserved' 
  AND expires_at <= now();
-- Should return 0
```

### Testing Checklist

- ✅ Endpoint requires valid CRON_SECRET
- ✅ Returns 401 without authorization
- ✅ Successfully releases expired reservations
- ✅ Ignores non-expired reservations
- ✅ Ignores committed reservations
- ✅ Ignores released reservations
- ✅ Returns correct count of orders processed
- ✅ Logs execution metrics
- ✅ Completes within reasonable time (<2s)

### Local Development Testing

**Option 1: Manual API Call**
```bash
# Set CRON_SECRET in .env.local
CRON_SECRET=dev-secret-123

# Start dev server
npm run dev

# Call endpoint
curl -X GET http://localhost:3000/api/cron/cleanup-reservations \
  -H "Authorization: Bearer dev-secret-123"
```

**Option 2: Create Test Reservations**
```sql
-- Insert a test expired reservation
INSERT INTO stock_reservations (
  order_id,
  variant_id,
  quantity,
  status,
  reserved_at,
  expires_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM variants LIMIT 1),
  1,
  'reserved',
  now() - interval '20 minutes',
  now() - interval '5 minutes'  -- Expired 5 minutes ago
);

-- Verify it exists
SELECT * FROM stock_reservations 
WHERE status = 'reserved' 
  AND expires_at <= now();

-- Trigger cleanup
-- (call API endpoint)

-- Verify it's released
SELECT * FROM stock_reservations 
WHERE status = 'released'
ORDER BY expires_at DESC LIMIT 1;
```

---

## Monitoring & Alerts

### Key Metrics

1. **Reservation Rate**: Orders created / reservations succeeded
2. **Out-of-Stock Rate**: OUT_OF_STOCK errors / checkout attempts
3. **Cancellation Rate**: Cancelled orders / total orders
4. **Expired Reservations**: Count of expired but unreleased reservations

### Log Messages

- `"Stock reservation error"` - Critical: reservation RPC failed
- `"CRITICAL: Payment successful but reservation commit failed"` - Requires manual intervention
- `"Payment modal dismissed"` - Info: user cancelled payment
- `"Reservations released for cancelled order"` - Info: cleanup successful
- `"[Cleanup Job] Released reservations for X orders"` - Info: automatic cleanup executed

---

## Summary

The inventory reservation system ensures:
- ✅ **Atomic stock management**: All-or-nothing reservation
- ✅ **No overselling**: Stock decremented before payment
- ✅ **Automatic cleanup**: Expired reservations released every 10 minutes
- ✅ **Idempotent operations**: Safe to retry payment verification
- ✅ **Clear audit trail**: All state transitions tracked in DB

**Cleanup Job Features**:
- ✅ Vercel Cron scheduling (every 10 minutes)
- ✅ Protected by CRON_SECRET authorization
- ✅ Idempotent and safe to re-run
- ✅ Comprehensive logging and metrics
- ✅ Manual trigger support for testing/emergencies

**Next Steps**:
1. Deploy cron job for expired reservation cleanup
2. Add admin monitoring dashboard
3. Create order_items table for historical tracking
4. Implement low-stock alerts
