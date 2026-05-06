-- AI-Powered Semantic Search
-- Adds vector embeddings support for intelligent product search

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to products table
-- Using 1536 dimensions (OpenAI text-embedding-3-small standard)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add search metadata for optimized queries
-- Stores pre-computed searchable text combining title, description, category, etc.
ALTER TABLE products
ADD COLUMN IF NOT EXISTS search_metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for fast vector similarity search
-- Uses IVFFlat algorithm with cosine distance for semantic similarity
CREATE INDEX IF NOT EXISTS products_embedding_idx 
ON products 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create GIN index on search_metadata for fast JSON queries
CREATE INDEX IF NOT EXISTS products_search_metadata_idx
ON products
USING gin (search_metadata);

-- Create search analytics table to track queries and improve results
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query text NOT NULL,
  results_count int NOT NULL DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS search_analytics_query_idx ON search_analytics(search_query);
CREATE INDEX IF NOT EXISTS search_analytics_created_at_idx ON search_analytics(created_at DESC);

-- Function to update search metadata when product changes
CREATE OR REPLACE FUNCTION update_product_search_metadata()
RETURNS trigger AS $$
BEGIN
  -- Combine searchable fields into metadata JSON
  NEW.search_metadata := jsonb_build_object(
    'title_lower', LOWER(COALESCE(NEW.name, '')),
    'description_lower', LOWER(COALESCE(NEW.description, '')),
    'category_lower', LOWER(COALESCE(NEW.category, '')),
    'tags', COALESCE(NEW.tags, ARRAY[]::text[]),
    'base_price', NEW.base_price,
    'is_active', NEW.is_active,
    'has_stock', CASE
      WHEN to_regclass('public.variants') IS NOT NULL THEN EXISTS(
        SELECT 1 FROM variants
        WHERE product_id = NEW.id AND stock_quantity > 0
      )
      ELSE false
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search metadata
DROP TRIGGER IF EXISTS trigger_update_search_metadata ON products;
CREATE TRIGGER trigger_update_search_metadata
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_metadata();

-- Update existing products with search metadata
UPDATE products SET search_metadata = jsonb_build_object(
  'title_lower', LOWER(COALESCE(name, '')),
  'description_lower', LOWER(COALESCE(description, '')),
  'category_lower', LOWER(COALESCE(category, '')),
  'tags', COALESCE(tags, ARRAY[]::text[]),
  'base_price', base_price,
  'is_active', is_active,
  'has_stock', CASE
    WHEN to_regclass('public.variants') IS NOT NULL THEN EXISTS(
      SELECT 1 FROM variants v
      WHERE v.product_id = products.id AND v.stock_quantity > 0
    )
    ELSE false
  END
)
WHERE search_metadata = '{}'::jsonb;

-- Function for vector similarity search
DROP FUNCTION IF EXISTS search_products_by_embedding(text, float, int);
CREATE OR REPLACE FUNCTION search_products_by_embedding(
  query_embedding text,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  base_price numeric,
  image_url text,
  slug text,
  similarity float,
  in_stock boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name as title,
    p.description,
    p.category,
    p.base_price,
    p.image_url,
    p.slug,
    1 - (p.embedding <=> query_embedding::vector) AS similarity,
    COALESCE((p.search_metadata->>'has_stock')::boolean, false) AS in_stock
  FROM products p
  WHERE 
    p.is_active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding::vector) >= match_threshold
  ORDER BY p.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_products_by_embedding TO authenticated, anon;

-- Add comments
COMMENT ON COLUMN products.embedding IS 'Vector embedding for semantic search (1536 dimensions)';
COMMENT ON COLUMN products.search_metadata IS 'Pre-computed metadata for fast search filtering';
COMMENT ON TABLE search_analytics IS 'Tracks search queries for analytics and AI improvement';
