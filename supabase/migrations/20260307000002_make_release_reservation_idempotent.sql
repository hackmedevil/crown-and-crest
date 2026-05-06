-- Ensure release_reservation is idempotent and concurrency-safe.
-- This implementation only restores stock for rows that are atomically moved
-- from 'reserved' -> 'released' within the same statement.

CREATE OR REPLACE FUNCTION release_reservation(p_order_id uuid)
RETURNS json AS $$
DECLARE
  affected int;
BEGIN
  WITH released_rows AS (
    UPDATE stock_reservations
    SET status = 'released'
    WHERE order_id = p_order_id
      AND status = 'reserved'
    RETURNING variant_id, quantity
  )
  UPDATE variants v
  SET stock_quantity = v.stock_quantity + r.quantity
  FROM released_rows r
  WHERE v.id = r.variant_id;

  GET DIAGNOSTICS affected = ROW_COUNT;

  RETURN json_build_object('ok', true, 'released', affected);
END;
$$ LANGUAGE plpgsql;
