-- Add missing columns to cart_items table

-- Add variant_id if it doesn't exist
DO $$ BEGIN
  ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES variants(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add product_id if it doesn't exist
DO $$ BEGIN
  ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add quantity if it doesn't exist
DO $$ BEGIN
  ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add timestamps if they don't exist
DO $$ BEGIN
  ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant ON cart_items(variant_id);
