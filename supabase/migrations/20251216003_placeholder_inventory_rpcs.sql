-- Placeholder Inventory RPCs (safe, atomic patterns)
-- These are minimal implementations to enable future integration.
-- They do not alter existing checkout logic.

-- Prereqs (assumed existing from prior migrations):
--   - variants(id uuid, stock_quantity int, ...)
--   - stock_reservations(id uuid, variant_id uuid, quantity int, status text, reserved_at timestamptz, expires_at timestamptz)
--     status ∈ ('reserved','released','committed')

-- Ensure non-negative stock at DB level (idempotent)
DO $$ BEGIN
  ALTER TABLE variants
  ADD CONSTRAINT variants_stock_non_negative CHECK (stock_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) reserve_stock(variant_id, qty)
-- Atomically decrements stock if available and creates a reservation row.
-- Returns JSON with reservation_id.
CREATE OR REPLACE FUNCTION reserve_stock(
  p_variant_id uuid,
  p_qty int
) RETURNS json AS $$
DECLARE
  upd_id uuid;
  res_id uuid;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  -- Atomic decrement guarded by current stock
  UPDATE variants
  SET stock_quantity = stock_quantity - p_qty
  WHERE id = p_variant_id AND stock_quantity >= p_qty
  RETURNING id INTO upd_id;

  IF upd_id IS NULL THEN
    RAISE EXCEPTION 'OUT_OF_STOCK';
  END IF;

  -- Minimal reservation row (15 min expiry placeholder)
  INSERT INTO stock_reservations(variant_id, quantity, status, reserved_at, expires_at)
  VALUES (p_variant_id, p_qty, 'reserved', now(), now() + interval '15 minutes')
  RETURNING id INTO res_id;

  RETURN json_build_object('ok', true, 'reservation_id', res_id);
EXCEPTION WHEN OTHERS THEN
  -- Bubble up errors to ensure transaction rollback
  RAISE;
END; $$ LANGUAGE plpgsql;

-- 2) commit_reservation(reservation_id)
-- Marks reservation as committed (no stock change; already decremented during reserve).
CREATE OR REPLACE FUNCTION commit_reservation(
  p_reservation_id uuid
) RETURNS json AS $$
DECLARE
  affected int;
BEGIN
  UPDATE stock_reservations
  SET status = 'committed'
  WHERE id = p_reservation_id AND status = 'reserved';

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected = 0 THEN
    RAISE EXCEPTION 'RESERVATION_EXPIRED_OR_NOT_FOUND';
  END IF;

  RETURN json_build_object('ok', true, 'committed', affected);
END; $$ LANGUAGE plpgsql;

-- 3) release_reservation(reservation_id)
-- Increments stock back and marks reservation as released.
CREATE OR REPLACE FUNCTION release_reservation(
  p_reservation_id uuid
) RETURNS json AS $$
DECLARE
  v_id uuid;
  v_qty int;
  affected int;
BEGIN
  -- Load reservation (only active ones)
  SELECT variant_id, quantity INTO v_id, v_qty
  FROM stock_reservations
  WHERE id = p_reservation_id AND status = 'reserved';

  IF v_id IS NULL THEN
    -- NO-OP placeholder: already released/committed or not found
    RETURN json_build_object('ok', true, 'released', 0);
  END IF;

  -- Return stock
  UPDATE variants
  SET stock_quantity = stock_quantity + v_qty
  WHERE id = v_id;

  -- Mark released
  UPDATE stock_reservations
  SET status = 'released'
  WHERE id = p_reservation_id AND status = 'reserved';
  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN json_build_object('ok', true, 'released', affected);
END; $$ LANGUAGE plpgsql;

-- 4) release_expired_reservations()
-- Placeholder cleaner: releases all expired reservations in a set-based update.
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS json AS $$
DECLARE
  affected int := 0;
BEGIN
  -- Add back stock for all expired 'reserved' rows
  WITH exp AS (
    SELECT id, variant_id, quantity
    FROM stock_reservations
    WHERE status = 'reserved' AND expires_at <= now()
  )
  UPDATE variants v
  SET stock_quantity = v.stock_quantity + e.quantity
  FROM exp e
  WHERE v.id = e.variant_id;

  -- Mark reservations as released
  UPDATE stock_reservations
  SET status = 'released'
  WHERE status = 'reserved' AND expires_at <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN json_build_object('ok', true, 'released_count', affected);
END; $$ LANGUAGE plpgsql;

-- 5) admin_adjust_stock(variant_id, delta)
-- Admin manual adjustment; prevents negative outcomes.
CREATE OR REPLACE FUNCTION admin_adjust_stock(
  p_variant_id uuid,
  p_delta int
) RETURNS json AS $$
DECLARE
  new_stock int;
BEGIN
  UPDATE variants
  SET stock_quantity = stock_quantity + p_delta
  WHERE id = p_variant_id
  RETURNING stock_quantity INTO new_stock;

  IF new_stock < 0 THEN
    RAISE EXCEPTION 'NEGATIVE_STOCK_NOT_ALLOWED';
  END IF;

  RETURN json_build_object('ok', true, 'new_stock', new_stock);
END; $$ LANGUAGE plpgsql;
