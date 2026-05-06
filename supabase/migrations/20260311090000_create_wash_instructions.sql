-- Wash instruction profiles for admin care guidance management

CREATE TABLE IF NOT EXISTS wash_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  summary TEXT,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wash_instructions_name ON wash_instructions(name);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'wash_instruction_id'
  ) THEN
    -- already present
    NULL;
  ELSE
    ALTER TABLE products
      ADD COLUMN wash_instruction_id UUID NULL REFERENCES wash_instructions(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_products_wash_instruction_id ON products(wash_instruction_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_wash_instructions_updated_at ON wash_instructions;
    CREATE TRIGGER trg_wash_instructions_updated_at
      BEFORE UPDATE ON wash_instructions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
