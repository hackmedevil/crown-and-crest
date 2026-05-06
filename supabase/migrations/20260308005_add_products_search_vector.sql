-- ==============================================================
-- ADD PRODUCTS SEARCH VECTOR
-- Date: 2026-03-08
-- Purpose: Enable PostgreSQL full-text search for products
-- ==============================================================

-- 1) Add tsvector column (safe if re-run)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2) Keep search_vector up to date from product text fields
CREATE OR REPLACE FUNCTION products_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.brand, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.short_description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'D');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_search_vector_update ON products;

CREATE TRIGGER trg_products_search_vector_update
BEFORE INSERT OR UPDATE OF name, brand, short_description, description
ON products
FOR EACH ROW
EXECUTE FUNCTION products_search_vector_update();

-- 3) Backfill existing rows
UPDATE products
SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(short_description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'D')
WHERE search_vector IS NULL;

-- 4) Create GIN index for FTS queries
CREATE INDEX IF NOT EXISTS idx_products_search_vector_shop
ON products
USING gin(search_vector);

COMMENT ON INDEX idx_products_search_vector_shop IS 'Shop search GIN index for text search';
