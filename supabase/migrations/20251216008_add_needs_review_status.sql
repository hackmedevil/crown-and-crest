-- Add NEEDS_REVIEW to order_status enum
DO $$ BEGIN
  ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;