-- Reload PostgREST schema cache and ensure bullet_points column exists

ALTER TABLE products
ADD COLUMN IF NOT EXISTS bullet_points text[] DEFAULT '{}';

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');
