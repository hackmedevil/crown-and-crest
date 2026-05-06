# Inventory + Payment Failsafe Recovery & Monitoring

This document defines failure scenarios, recovery flow, logging, and admin queries to handle rare inconsistencies where Razorpay payment succeeds but inventory commit fails.

## Failure Scenarios
- Payment verified (order.status = PAID; Razorpay payment ID present) but `commit_reservation(order_id)` fails due to:
  - `RESERVATION_EXPIRED_OR_NOT_FOUND` (reservation window elapsed or missing rows)
  - Transient DB error or timeout
  - Partial reservation state (some rows reserved, others released)
- PAID order has lingering `stock_reservations` with `status = 'reserved'`
- PAID order has zero `committed` reservations (unexpected for successful checkout)

## Safety Rules
- Never auto-release inventory for PAID orders.
- Never auto-commit inventory without payment proof (PAID + Razorpay payment ID).
- All recovery actions are server-only and admin-gated.

## Recovery Flow
1. Detect state for an order:
   - If reservations already `committed` and none `reserved`: skip safely.
   - If order not PAID or missing payment proof: do not commit; log inconsistency.
2. Attempt re-commit:
   - Call `commit_reservation(order_id)` (idempotent; only affects `status = 'reserved'`).
   - On success: log `RECOVERY_SUCCESS` with counts.
   - On failure/exception: log `RECOVERY_FAILED`, set `orders.status = 'NEEDS_REVIEW'` (manual follow-up required). Do NOT release stock.

## Monitoring & Logging
- DB table: `order_inventory_logs`
  - Columns: `order_id`, `user_uid`, `reservation_ids[]`, `action`, `error_reason`, `context`, `created_at`.
  - Actions: `RECOVERY_ATTEMPT`, `RECOVERY_SUCCESS`, `RECOVERY_SKIPPED_ALREADY_COMMITTED`, `RECOVERY_FAILED`, `INCONSISTENCY_DETECTED`.
- Fallback logging: `console.error('[InventoryRecoveryLog]', ...)` if DB insert fails.
- Easy querying by `order_id` and `created_at`.

## Server-Only Recovery Helper
- Function: `recoverOrderInventory(orderId)` in `src/lib/admin/actions/inventory.ts`.
- Behavior:
  - Requires admin.
  - Loads order; verifies payment proof.
  - Computes reservation state: `reservedCount`, `committedCount`.
  - If already committed: logs and returns without changes.
  - If PAID: attempts `commit_reservation`;
    - On error: logs and marks `NEEDS_REVIEW`.
  - Never releases stock for PAID orders.

## Admin Queries (No UI)
- `listOrdersNeedingReview()`: Lists orders with `status = 'NEEDS_REVIEW'`.
- `findPaidOrdersWithUncommittedReservations()`: Finds PAID orders where `reservedCount > 0` or `committedCount = 0`.

## Manual Intervention Steps
- For orders in `NEEDS_REVIEW`:
  1. Verify payment in Razorpay dashboard (ensure funds captured).
  2. Inspect `stock_reservations` for the order:
     ```sql
     SELECT id, variant_id, quantity, status, reserved_at, expires_at
     FROM stock_reservations
     WHERE order_id = '<order-id>'
     ORDER BY variant_id;
     ```
  3. If reservations still `reserved` and stock is correct, run commit manually:
     ```sql
     SELECT commit_reservation('<order-id>');
     ```
  4. If reservations are `released` but payment succeeded:
     - Decide fulfillment policy; you may need a manual stock adjustment and a compensating reservation/commit.
     - Document the action with an `order_inventory_logs` entry (optional insert).
  5. After resolution, set order status back to `PAID` or proceed to `FULFILLMENT_PENDING`.

## Migrations Added
- `20251216008_add_needs_review_status.sql`: Adds `NEEDS_REVIEW` to `order_status` enum.
- `20251216009_create_order_inventory_logs.sql`: Creates logging table and indexes.

## Notes
- `commit_reservation` throws `RESERVATION_EXPIRED_OR_NOT_FOUND` when no `reserved` rows remain. The helper differentiates by inspecting current reservation state for idempotency.
- Stock is decremented at reservation time; commit does not change stock, it finalizes audit state. Ensure no double-commit/release by relying on status guards in RPCs.
