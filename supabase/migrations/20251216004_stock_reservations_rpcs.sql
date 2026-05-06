-- Stock reservations and inventory RPCs

-- Drop existing functions to recreate them with new signatures
DROP FUNCTION IF EXISTS commit_reservation(uuid);
DROP FUNCTION IF EXISTS release_reservation(uuid);
DROP FUNCTION IF EXISTS release_expired_reservations();
DROP FUNCTION IF EXISTS reserve_stock(uuid, text, jsonb, integer);

-- 1) stock_reservations table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS stock_reservations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL,
    variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
    user_uid text,
    quantity integer NOT NULL CHECK (quantity > 0),
    status text NOT NULL CHECK (status IN ('reserved','released','committed')),
    reserved_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,

    CONSTRAINT stock_reservations_unique_active UNIQUE (order_id, variant_id, status)
      DEFERRABLE INITIALLY IMMEDIATE
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_stock_reservations_order ON stock_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_variant ON stock_reservations(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_status ON stock_reservations(status);
CREATE INDEX IF NOT EXISTS idx_stock_reservations_expires ON stock_reservations(expires_at) WHERE status='reserved';

-- Helper: ensure variants.stock_quantity is non-negative (if not already enforced)
DO $$ BEGIN
  ALTER TABLE variants
  ADD CONSTRAINT variants_stock_non_negative CHECK (stock_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) reserve_stock(order_id, uid, items_json, ttl_seconds)
CREATE OR REPLACE FUNCTION reserve_stock(
  p_order_id uuid,
  p_uid text,
  p_items jsonb,
  p_ttl_seconds integer DEFAULT 900
) RETURNS json AS $$
DECLARE
  requested_count int;
  updated_count int;
  expires_at_ts timestamptz;
BEGIN
  expires_at_ts := now() + make_interval(secs => COALESCE(p_ttl_seconds, 900));

  -- Parse items
  WITH items AS (
    SELECT (value->>'variant_id')::uuid AS variant_id,
           (value->>'qty')::int       AS qty
    FROM jsonb_array_elements(p_items)
  )
  , updated AS (
    UPDATE variants v
    SET stock_quantity = v.stock_quantity - i.qty
    FROM items i
    WHERE v.id = i.variant_id
      AND v.stock_quantity >= i.qty
    RETURNING v.id
  )
  SELECT (SELECT COUNT(*) FROM (SELECT 1 FROM jsonb_array_elements(p_items)) s) AS req,
         (SELECT COUNT(*) FROM updated) AS upd
  INTO requested_count, updated_count;

  IF updated_count IS NULL THEN
    updated_count := 0;
  END IF;

  IF requested_count IS NULL THEN
    requested_count := 0;
  END IF;

  IF requested_count = 0 THEN
    RAISE EXCEPTION 'No items to reserve';
  END IF;

  IF requested_count <> updated_count THEN
    RAISE EXCEPTION 'OUT_OF_STOCK';
  END IF;

  -- Insert reservations
  INSERT INTO stock_reservations(order_id, variant_id, quantity, user_uid, status, reserved_at, expires_at)
  SELECT p_order_id, (value->>'variant_id')::uuid, (value->>'qty')::int, p_uid,
         'reserved', now(), expires_at_ts
  FROM jsonb_array_elements(p_items);

  RETURN json_build_object('ok', true, 'reserved', updated_count);
EXCEPTION WHEN OTHERS THEN
  RAISE; -- ensure rollback by bubbling up error
END;
$$ LANGUAGE plpgsql;

-- 3) commit_reservation(order_id)
CREATE OR REPLACE FUNCTION commit_reservation(p_order_id uuid)
RETURNS json AS $$
DECLARE
  affected int;
BEGIN
  UPDATE stock_reservations
  SET status = 'committed'
  WHERE order_id = p_order_id
    AND status = 'reserved';

  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 THEN
    RAISE EXCEPTION 'RESERVATION_EXPIRED_OR_NOT_FOUND';
  END IF;

  RETURN json_build_object('ok', true, 'committed', affected);
END;
$$ LANGUAGE plpgsql;

-- 4) release_reservation(order_id)
CREATE OR REPLACE FUNCTION release_reservation(p_order_id uuid)
RETURNS json AS $$
DECLARE
  affected int;
BEGIN
  WITH to_release AS (
    SELECT id, variant_id, quantity
    FROM stock_reservations
    WHERE order_id = p_order_id AND status = 'reserved'
  )
  UPDATE variants v
  SET stock_quantity = v.stock_quantity + r.quantity
  FROM to_release r
  WHERE v.id = r.variant_id;

  UPDATE stock_reservations
  SET status = 'released'
  WHERE order_id = p_order_id AND status = 'reserved';

  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN json_build_object('ok', true, 'released', affected);
END;
$$ LANGUAGE plpgsql;

-- 5) release_expired_reservations()
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS json AS $$
DECLARE
  order_row RECORD;
  released_total int := 0;
BEGIN
  FOR order_row IN (
    SELECT DISTINCT order_id
    FROM stock_reservations
    WHERE status = 'reserved' AND expires_at <= now()
  ) LOOP
    PERFORM release_reservation(order_row.order_id);
    released_total := released_total + 1;
  END LOOP;

  RETURN json_build_object('ok', true, 'orders_processed', released_total);
END;
$$ LANGUAGE plpgsql;

-- 6) admin_adjust_stock(variant_id, delta, reason)
CREATE OR REPLACE FUNCTION admin_adjust_stock(p_variant_id uuid, p_delta int, p_reason text DEFAULT NULL)
RETURNS json AS $$
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

  -- Optional: insert into stock_movements if table exists
  -- PERFORM 1 FROM stock_movements LIMIT 1;
  -- INSERT INTO stock_movements(variant_id, quantity_change, reason) VALUES (p_variant_id, p_delta, COALESCE(p_reason, 'manual_adjustment'));

  RETURN json_build_object('ok', true, 'new_stock', new_stock);
END;
$$ LANGUAGE plpgsql;