-- 1) Create order_items table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id uuid NOT NULL REFERENCES variants(id) ON DELETE RESTRICT,
    product_name text NOT NULL,
    variant_label text,
    unit_price integer NOT NULL CHECK (unit_price > 0), -- in paise
    quantity integer NOT NULL CHECK (quantity > 0),
    subtotal integer NOT NULL CHECK (subtotal > 0),
    created_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id);

-- 2) Snapshot RPC: create_order_items_snapshot(order_id, uid)
DROP FUNCTION IF EXISTS create_order_items_snapshot(uuid, text);
CREATE OR REPLACE FUNCTION create_order_items_snapshot(p_order_id uuid, p_uid text)
RETURNS json AS $$
DECLARE
  existing_count int := 0;
  status_text text;
  committed_count int := 0;
  inserted_count int := 0;
BEGIN
  -- Load order status and guard
  SELECT status::text INTO status_text FROM orders WHERE id = p_order_id;
  IF status_text IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF status_text != 'PAID' THEN
    RAISE EXCEPTION 'ORDER_NOT_PAID';
  END IF;

  IF status_text IN ('FAILED','CANCELLED','NEEDS_REVIEW') THEN
    RAISE EXCEPTION 'SNAPSHOT_NOT_ALLOWED_FOR_STATE_%', status_text;
  END IF;

  -- Require committed reservations (safety)
  SELECT COUNT(*) INTO committed_count FROM stock_reservations WHERE order_id = p_order_id AND status = 'committed';
  IF committed_count = 0 THEN
    RAISE EXCEPTION 'RESERVATION_NOT_COMMITTED';
  END IF;

  -- Idempotency: if items already exist, do nothing
  SELECT COUNT(*) INTO existing_count FROM order_items WHERE order_id = p_order_id;
  IF existing_count > 0 THEN
    RETURN json_build_object('ok', true, 'already_exists', true, 'count', existing_count);
  END IF;

  -- Insert snapshot rows from current cart + products/variants
  WITH cart AS (
    SELECT ci.product_id, ci.variant_id, ci.quantity
    FROM cart_items ci
    WHERE ci.firebase_uid = p_uid
  ), priced AS (
    SELECT c.product_id,
           c.variant_id,
           c.quantity,
           p.name AS product_name,
           COALESCE(v.price_override, p.base_price) AS unit_price,
           -- Build variant label like "Size M / Black" when available
           CONCAT_WS(' / ',
             CASE WHEN v.size IS NOT NULL AND v.size <> '' THEN 'Size ' || v.size ELSE NULL END,
             NULLIF(v.color, '')
           ) AS variant_label
    FROM cart c
    JOIN products p ON p.id = c.product_id
    JOIN variants v ON v.id = c.variant_id
  )
  INSERT INTO order_items(order_id, product_id, variant_id, product_name, variant_label, unit_price, quantity, subtotal)
  SELECT p_order_id,
         p.product_id,
         p.variant_id,
         p.product_name,
         p.variant_label,
         p.unit_price,
         p.quantity,
         p.unit_price * p.quantity
  FROM priced p;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN json_build_object('ok', true, 'inserted', inserted_count);
END;
$$ LANGUAGE plpgsql;
