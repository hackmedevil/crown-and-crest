-- Create ENUM types for returns
DO $$ BEGIN
  CREATE TYPE return_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'PICKUP_SCHEDULED',
    'IN_TRANSIT',
    'INSPECTION_PENDING',
    'REFUNDED',
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE return_reason AS ENUM (
    'WRONG_SIZE',
    'DAMAGED_PRODUCT',
    'NOT_AS_EXPECTED',
    'QUALITY_ISSUE',
    'RECEIVED_WRONG_ITEM',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE return_resolution AS ENUM (
    'REFUND',
    'EXCHANGE',
    'STORE_CREDIT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE refund_method AS ENUM (
    'ORIGINAL_PAYMENT',
    'WALLET'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create returns table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    firebase_uid text NOT NULL,
    status return_status NOT NULL DEFAULT 'REQUESTED',
    resolution return_resolution NOT NULL,
    reason_code return_reason NOT NULL,
    reason_comments text,
    refund_method refund_method NOT NULL DEFAULT 'ORIGINAL_PAYMENT',
    refund_amount integer, -- in paise, NULL until approved
    estimated_refund_date timestamptz,
    actual_refund_date timestamptz,
    pickup_address jsonb,
    pickup_scheduled_date timestamptz,
    courier_name text,
    tracking_number text,
    tracking_link text,
    images_url text[], -- array of image URLs for damage/issues
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT refund_in_paise CHECK (refund_amount IS NULL OR refund_amount > 0)
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Create return_items table (items being returned)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS return_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
    order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
    quantity integer NOT NULL CHECK (quantity > 0),
    reason_for_item return_reason NOT NULL,
    images_url text[], -- item-specific images
    created_at timestamptz NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_returns_firebase_uid ON returns(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_return_items_order_item_id ON return_items(order_item_id);

-- Enable RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for returns table
CREATE POLICY returns_user_select ON returns
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY returns_user_insert ON returns
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY returns_user_update ON returns
  FOR UPDATE
  USING (firebase_uid = auth.uid()::text)
  WITH CHECK (firebase_uid = auth.uid()::text);

-- RLS Policies for return_items table
CREATE POLICY return_items_user_select ON return_items
  FOR SELECT
  USING (
    return_id IN (
      SELECT id FROM returns WHERE firebase_uid = auth.uid()::text
    )
  );

CREATE POLICY return_items_user_insert ON return_items
  FOR INSERT
  WITH CHECK (
    return_id IN (
      SELECT id FROM returns WHERE firebase_uid = auth.uid()::text
    )
  );

-- Modified timestamp trigger
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER returns_updated_at_trigger
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();
