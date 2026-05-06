# Inventory Locking & Concurrency Control

Robust, Postgres-safe inventory control ensuring no overselling under high traffic.

---

## 1) Inventory Lifecycle (Text Diagram)

States and transitions for a single variant SKU:

```
Cart (no lock) 
  → Checkout Initiated (no lock yet)
    → Reserve Stock (atomic decrement) [status: RESERVED, expires_at]
      → Payment Processing
        → Payment Succeeds
          → Commit Reservation (link to PAID order) [status: COMMITTED]
            → Fulfillment
        → Payment Fails / Cancelled
          → Release Reservation (atomic increment) [status: RELEASED]
        → Payment Delayed / Timeout
          → Reservation Expires → Release Reservation (atomic increment)
```

Notes:
- Reservation performs the actual stock decrement to guarantee availability.
- Release adds stock back only if payment fails or reservation expires.
- Commit does not change stock (already decremented); it finalizes audit state.

---

## 2) Tables (Conceptual)

- `variants(id, stock_quantity, ... )` – source of truth for available stock
- `stock_reservations(id, order_id, variant_id, quantity, reserved_at, expires_at, status, user_uid)` – audit and control of reserved units
  - `status ∈ { 'reserved', 'released', 'committed' }`
  - `expires_at` used for cleanup and safety

Optional (future):
- `stock_movements(id, variant_id, quantity_change, reason, notes, created_at, created_by)` – full audit trail

---

## 3) Postgres-Safe Patterns (SQL/RPC)

### 3.1 Atomic Reserve (Decrement with Guard)

Purpose: Prevent race conditions when multiple users buy the last unit.

Single item:
```sql
-- Decrement only if enough stock remains
UPDATE variants
SET stock_quantity = stock_quantity - :qty
WHERE id = :variant_id
  AND stock_quantity >= :qty
RETURNING id;
```
- If zero rows returned → insufficient stock (another transaction got it first).

Multi-item (cart) in one transaction:
```sql
-- items_json = [{ variant_id, qty }, ...]
WITH items AS (
  SELECT (value->>'variant_id')::uuid AS variant_id,
         (value->>'qty')::int       AS qty
  FROM jsonb_array_elements(:items_json)
)
, updated AS (
  UPDATE variants v
  SET stock_quantity = v.stock_quantity - i.qty
  FROM items i
  WHERE v.id = i.variant_id
    AND v.stock_quantity >= i.qty
  RETURNING v.id
)
SELECT (SELECT COUNT(*) FROM items)  AS requested,
       (SELECT COUNT(*) FROM updated) AS updated;
```
Application logic:
- If `requested != updated` → ROLLBACK (not enough stock for at least one item).
- Else COMMIT and insert `stock_reservations` rows.

### 3.2 Reservation Rows

Insert after successful decrement:
```sql
INSERT INTO stock_reservations(order_id, variant_id, quantity, user_uid, reserved_at, expires_at, status)
SELECT :order_id, i.variant_id, i.qty, :uid, now(), now() + (:ttl || ' seconds')::interval, 'reserved'
FROM jsonb_to_recordset(:items_json) AS i(variant_id uuid, qty int);
```

### 3.3 Release Reservation (Failure/Timeout)

```sql
-- Increment stock back from active reservations for an order
WITH to_release AS (
  SELECT id, variant_id, quantity
  FROM stock_reservations
  WHERE order_id = :order_id AND status = 'reserved'
)
, inc AS (
  UPDATE variants v
  SET stock_quantity = v.stock_quantity + r.quantity
  FROM to_release r
  WHERE v.id = r.variant_id
  RETURNING v.id
)
UPDATE stock_reservations
SET status = 'released'
WHERE order_id = :order_id AND status = 'reserved';
```
- Entire operation should run inside a transaction.

### 3.4 Commit Reservation (Payment Success)

```sql
UPDATE stock_reservations
SET status = 'committed'
WHERE order_id = :order_id AND status = 'reserved';
```
- No stock change; stock was already decremented at reservation.

### 3.5 Expired Reservation Cleanup (Manual Trigger)

No cron yet: provide callable RPC to release all expired holds.
```sql
-- Release any expired reservations
WITH exp AS (
  SELECT order_id FROM stock_reservations
  WHERE status = 'reserved' AND expires_at <= now()
  GROUP BY order_id
)
SELECT release_reservation(e.order_id) FROM exp e;  -- calls the release function above
```

---

## 4) RPC Interfaces (Proposed)

Wrap the patterns above into RPC functions (run in transaction by default):

- `reserve_stock(order_id uuid, uid text, items_json jsonb, ttl_seconds int)` → { ok, error }
  - 1) Atomic multi-row decrement with guard
  - 2) Insert `stock_reservations` rows (status='reserved')
  - 3) Return success or raise exception to rollback

- `commit_reservation(order_id uuid)` → { ok }
  - Mark reservations as `committed` after payment verification

- `release_reservation(order_id uuid)` → { ok, released_count }
  - Increment stock back and set status='released'

- `release_expired_reservations()` → { ok, released_orders }
  - Iterate over expired `reserved` rows and release

- `admin_adjust_stock(variant_id uuid, delta int, reason text)` → { ok, new_stock }
  - Ensures `new_stock >= 0`; writes to `stock_movements` (future)

All functions should `RAISE EXCEPTION` on error to ensure rollback.

---

## 5) Checkout Flow Integration Rules

### 5.1 When to Reserve
- Reserve immediately when creating an order with status `PAYMENT_PENDING`.
- Perform reservation (atomic decrement) in the same transaction that creates the order record.
- On reservation failure (insufficient stock), abort order creation and return precise errors per line item.

### 5.2 When to Deduct
- Deduction is done at reservation time (stock decremented). This guarantees availability through payment.

### 5.3 When to Release
- On payment failure/cancel: call `release_reservation(order_id)` and set order to `FAILED` or `CANCELLED`.
- On timeout: call `release_expired_reservations()` (manually triggered for now, or opportunistically at login/checkout APIs).
- On payment success: call `commit_reservation(order_id)`; no stock change, only finalize reservation status.

### 5.4 Multi-Item Carts
- Use the multi-row CTE update. If any item cannot be reserved, rollback everything and return which items failed.

---

## 6) Edge Cases & Expected Behavior

1) Two users buy last unit simultaneously
- First transaction to update wins (`UPDATE ... WHERE stock_quantity >= qty RETURNING id`).
- Second transaction updates 0 rows → reservation fails → return OUT_OF_STOCK.

2) Payment initiated but not completed
- Items remain reserved until payment outcome.
- On failure/cancel: release immediately.
- On timeout: reservation expires and is released by maintenance call.

3) Order verification delayed (webhook latency)
- Reservation TTL (e.g., 15 minutes) keeps stock held.
- If verification arrives after TTL but before release, still commit if status='reserved'.
- If already released due to expiry, commit should fail and signal manual resolution.

4) Partial variant failures during reservation
- Multi-row reservation runs in one transaction.
- If any item fails the stock guard, the whole transaction rolls back (no partial holds).
- Response includes per-item failures so UI can adjust quantities.

5) Admin manual stock updates during reservations
- Since stock is decremented at reservation time, `variants.stock_quantity` reflects available units.
- Admin updates must not set negative stock; enforce CHECK constraint and validation.
- Recommend writing a stock movement entry for audits (future table).

---

## 7) Admin Operations

- Manual correction: `admin_adjust_stock(variant_id, delta)` validates `new_stock >= 0`.
- Audits: periodically compute `sum(reserved quantities for active orders)` + `variants.stock_quantity` against expected totals.
- Bulk updates: perform in a transaction; if any row violates constraints, rollback and report.

---

## 8) Optional (Future-Ready)

### 8.1 Stock Movements / Audit Table
Reasons: `reservation`, `release`, `commit`, `manual_adjustment`, `return`, `order_refund`.

```sql
INSERT INTO stock_movements(variant_id, quantity_change, reason, notes, created_by)
VALUES (:variant_id, :delta, :reason, :notes, :admin_uid);
```

### 8.2 Low-Stock Alerts
- Maintain `variants.low_stock_threshold`.
- Query: `WHERE enabled = true AND stock_quantity <= low_stock_threshold`.
- Trigger notifications in admin dashboard or scheduled job.

---

## 9) Validation & Safety Checklist

- Atomic decrement guard: `UPDATE ... SET stock = stock - qty WHERE stock >= qty RETURNING id`.
- All cart items reserved in a single transaction.
- Insert reservation rows with `expires_at` and `status='reserved'`.
- On failure/cancel/timeout → release stock in a transaction.
- Commit does not change stock; it finalizes reservation for audit.
- Prevent negative stock via DB constraint and app validation.
- Never hard-delete variants referenced by orders; use `enabled=false`.

---

## 10) Error Types

- `OUT_OF_STOCK` – Conditional update returned 0 rows for one or more items.
- `RESERVATION_EXPIRED` – Attempted commit after release.
- `INVALID_QUANTITY` – Non-integer or negative quantities.
- `CONFLICTING_UPDATE` – Admin update violated constraints.
- `INTERNAL_ERROR` – Database or transaction failure; log and retry if idempotent.

---

## 11) Notes on Isolation & Locking

- The conditional `UPDATE ... WHERE stock_quantity >= qty` both checks and decrements, preventing race conditions without explicit `SELECT ... FOR UPDATE`.
- For carts spanning multiple SKUs, wrap all updates + reservation inserts + order creation in one transaction (via RPC).
- Avoid long-running transactions; keep reservation creation lean to reduce lock times.

---

## 12) Implementation Order

1) Add `stock_reservations` table (with `status` and `expires_at`).
2) Implement RPCs: `reserve_stock`, `commit_reservation`, `release_reservation`, `release_expired_reservations`.
3) Update checkout server flow to call RPCs at order creation and payment callbacks.
4) Add admin `admin_adjust_stock` and optional `stock_movements` logging.

This design ensures no overselling under contention, clear lifecycle states, and safe admin operations while remaining simple to implement and operate.
