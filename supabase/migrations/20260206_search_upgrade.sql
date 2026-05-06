-- Search Upgrade: AI fields, query embeddings, ranking utilities

-- 1) AI-friendly product fields
ALTER TABLE products
ADD COLUMN IF NOT EXISTS ai_title text,
ADD COLUMN IF NOT EXISTS ai_description text,
ADD COLUMN IF NOT EXISTS ai_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS style text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS weather text;

-- 2) Refresh search metadata with AI fields
CREATE OR REPLACE FUNCTION update_product_search_metadata()
RETURNS trigger AS $$
BEGIN
  NEW.search_metadata := jsonb_build_object(
    'title_lower', LOWER(COALESCE(NEW.ai_title, NEW.name, '')),
    'description_lower', LOWER(COALESCE(NEW.ai_description, NEW.description, '')),
    'category_lower', LOWER(COALESCE(NEW.category, '')),
    'tags', COALESCE(NEW.ai_tags, NEW.tags, ARRAY[]::text[]),
    'base_price', NEW.base_price,
    'is_active', NEW.is_active,
    'has_stock', EXISTS(
      SELECT 1 FROM variants 
      WHERE product_id = NEW.id AND stock_quantity > 0
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_search_metadata ON products;
CREATE TRIGGER trigger_update_search_metadata
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_metadata();

-- 3) Update embedding queue trigger to watch AI fields
CREATE OR REPLACE FUNCTION queue_embedding_job()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR
     (TG_OP = 'UPDATE' AND (
       NEW.name IS DISTINCT FROM OLD.name OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.category IS DISTINCT FROM OLD.category OR
       NEW.tags IS DISTINCT FROM OLD.tags OR
       NEW.ai_title IS DISTINCT FROM OLD.ai_title OR
       NEW.ai_description IS DISTINCT FROM OLD.ai_description OR
       NEW.ai_tags IS DISTINCT FROM OLD.ai_tags OR
       NEW.season IS DISTINCT FROM OLD.season OR
       NEW.fabric IS DISTINCT FROM OLD.fabric OR
       NEW.usage IS DISTINCT FROM OLD.usage OR
       NEW.style IS DISTINCT FROM OLD.style OR
       NEW.weather IS DISTINCT FROM OLD.weather OR
       NEW.style_keywords IS DISTINCT FROM OLD.style_keywords
     )) THEN
    NEW.embedding_status := 'pending';

    INSERT INTO embedding_jobs (product_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_queue_embedding ON products;
CREATE TRIGGER trigger_queue_embedding
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_job();

-- 4) Search query embedding cache (no AI calls during search)
CREATE TABLE IF NOT EXISTS search_query_embeddings (
  query text PRIMARY KEY,
  embedding vector(1536),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS search_query_embeddings_status_idx ON search_query_embeddings(status, updated_at DESC);

-- 5) Update search RPC to return created_at and AI title fallback
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
  in_stock boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.ai_title, p.name) AS title,
    p.description,
    p.category,
    p.base_price,
    p.image_url,
    p.slug,
    1 - (p.embedding <=> query_embedding::vector) AS similarity,
    COALESCE((p.search_metadata->>'has_stock')::boolean, false) AS in_stock,
    p.created_at
  FROM products p
  WHERE 
    p.is_active = true
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding::vector) >= match_threshold
  ORDER BY p.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6) Trending products view (used for zero-result fallback)
DO $$
BEGIN
  IF to_regclass('public.search_interactions') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW search_trending_products AS
      SELECT
        p.id,
        p.name,
        p.description,
        p.category,
        p.base_price,
        p.image_url,
        p.slug,
        p.created_at,
        COALESCE((p.search_metadata->>'has_stock')::boolean, false) AS in_stock,
        SUM(CASE WHEN si.interaction_type = 'click' THEN 1 ELSE 0 END) AS click_count,
        SUM(CASE WHEN si.interaction_type = 'cart_add' THEN 1 ELSE 0 END) AS cart_add_count,
        SUM(CASE WHEN si.interaction_type = 'purchase' THEN 1 ELSE 0 END) AS purchase_count
      FROM search_interactions si
      JOIN products p ON p.id = si.product_id
      WHERE si.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name, p.description, p.category, p.base_price, p.image_url, p.slug, p.created_at, p.search_metadata
      ORDER BY (SUM(CASE WHEN si.interaction_type = 'purchase' THEN 3 ELSE 0 END)
               + SUM(CASE WHEN si.interaction_type = 'cart_add' THEN 2 ELSE 0 END)
               + SUM(CASE WHEN si.interaction_type = 'click' THEN 1 ELSE 0 END)) DESC;
    $view$;
  END IF;
END $$;

-- 7) Analytics views for admin dashboard
CREATE OR REPLACE VIEW search_top_queries AS
SELECT
  search_query,
  COUNT(*) AS search_count,
  SUM(results_count) AS total_results,
  SUM(CASE WHEN results_count = 0 THEN 1 ELSE 0 END) AS zero_results
FROM search_analytics
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY search_query
ORDER BY search_count DESC;

DO $$
BEGIN
  IF to_regclass('public.search_interactions') IS NOT NULL THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW search_top_products AS
      SELECT
        p.id,
        p.name,
        p.slug,
        p.image_url,
        p.category,
        SUM(CASE WHEN si.interaction_type = 'click' THEN 1 ELSE 0 END) AS click_count,
        SUM(CASE WHEN si.interaction_type = 'cart_add' THEN 1 ELSE 0 END) AS cart_add_count,
        SUM(CASE WHEN si.interaction_type = 'purchase' THEN 1 ELSE 0 END) AS purchase_count
      FROM search_interactions si
      JOIN products p ON p.id = si.product_id
      WHERE si.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name, p.slug, p.image_url, p.category
      ORDER BY purchase_count DESC, cart_add_count DESC, click_count DESC;
    $view$;
  END IF;
END $$;

COMMENT ON COLUMN products.ai_title IS 'AI-optimized title for semantic search.';
COMMENT ON COLUMN products.ai_description IS 'AI-optimized description for semantic search.';
COMMENT ON COLUMN products.ai_tags IS 'AI tags for semantic search.';
COMMENT ON COLUMN products.style IS 'Style descriptors for semantic search.';
COMMENT ON COLUMN products.weather IS 'Weather suitability for semantic search.';
COMMENT ON TABLE search_query_embeddings IS 'Cached query embeddings for AI search (no per-search AI calls).';
DO $$
BEGIN
  IF to_regclass('public.search_interactions') IS NOT NULL THEN
    COMMENT ON VIEW search_trending_products IS 'Top interacted products in last 30 days for fallback.';
    COMMENT ON VIEW search_top_products IS 'Top products by search interactions (last 30 days).';
  END IF;
END $$;
COMMENT ON VIEW search_top_queries IS 'Top search queries with zero-result counts (last 30 days).';
