-- AI Product Memory Store
-- Persistent, indexed memory for retrieval-augmented generation

CREATE TABLE IF NOT EXISTS ai_product_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'ai_generate',
  category text NOT NULL,
  title text,
  image_description text,
  attributes jsonb,
  ai_output jsonb NOT NULL,
  embedding vector(1536),
  approved boolean NOT NULL DEFAULT false,
  quality_score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_product_memory_created_at_idx
  ON ai_product_memory(created_at DESC);

CREATE INDEX IF NOT EXISTS ai_product_memory_product_idx
  ON ai_product_memory(product_id);

CREATE INDEX IF NOT EXISTS ai_product_memory_embedding_idx
  ON ai_product_memory
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Vector match function
CREATE OR REPLACE FUNCTION match_ai_product_memory(
  query_embedding vector(1536),
  category_filter text DEFAULT NULL,
  match_threshold float DEFAULT 0.75,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  category text,
  title text,
  image_description text,
  attributes jsonb,
  ai_output jsonb,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.category,
    m.title,
    m.image_description,
    m.attributes,
    m.ai_output,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM ai_product_memory m
  WHERE m.embedding IS NOT NULL
    AND m.approved = true
    AND (category_filter IS NULL OR m.category = category_filter)
    AND 1 - (m.embedding <=> query_embedding) >= match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql STABLE;
