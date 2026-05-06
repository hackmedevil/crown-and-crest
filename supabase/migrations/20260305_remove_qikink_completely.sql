-- Remove all Qikink integration from the system
-- This migration drops all Qikink-related tables and columns

-- Drop all Qikink tables
DROP TABLE IF EXISTS qikink_webhook_logs CASCADE;
DROP TABLE IF EXISTS qikink_setup CASCADE;
DROP TABLE IF EXISTS qikink_import_rows CASCADE;
DROP TABLE IF EXISTS qikink_import_batches CASCADE;
DROP TABLE IF EXISTS qikink_products CASCADE;
DROP TABLE IF EXISTS qikink_api_keys CASCADE;

-- Remove Qikink columns from products table
ALTER TABLE IF EXISTS products
DROP COLUMN IF EXISTS synced_from_qikink_id CASCADE;

ALTER TABLE IF EXISTS products
DROP COLUMN IF EXISTS source_qikink_product_id CASCADE;

-- Drop any functions that may have been created for Qikink
DROP FUNCTION IF EXISTS update_qikink_setup_timestamp() CASCADE;

-- Log the removal
COMMENT ON TABLE products IS 'Main products table - Qikink integration removed on 2026-03-05';
