-- Create table for critical inventory/payment recovery logs
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS order_inventory_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_uid text,
    reservation_ids uuid[],
    action text NOT NULL CHECK (action IN (
      'RECOVERY_ATTEMPT',
      'RECOVERY_SUCCESS',
      'RECOVERY_SKIPPED_ALREADY_COMMITTED',
      'RECOVERY_FAILED',
      'INCONSISTENCY_DETECTED'
    )),
    error_reason text,
    context jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_order_inventory_logs_order ON order_inventory_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_inventory_logs_created ON order_inventory_logs(created_at);
