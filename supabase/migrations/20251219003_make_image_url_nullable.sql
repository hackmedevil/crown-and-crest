-- Make image_url nullable in products table
-- This allows products to be created without an image initially

DO $$ 
BEGIN
  ALTER TABLE products ALTER COLUMN image_url DROP NOT NULL;
EXCEPTION 
  WHEN OTHERS THEN 
    RAISE NOTICE 'Error in migration: %', SQLERRM;
END $$;
