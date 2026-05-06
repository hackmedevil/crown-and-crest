-- Production AI Search - Phase 1: Critical Automation
-- Adds enhanced product intelligence fields and automatic embedding system

-- 1. Enhanced Product Intelligence Fields
ALTER TABLE products
ADD COLUMN IF NOT EXISTS season text CHECK (season IN ('summer', 'winter', 'monsoon', 'all-season', NULL)),
ADD COLUMN IF NOT EXISTS fabric text[],
ADD COLUMN IF NOT EXISTS usage text CHECK (usage IN ('casual', 'formal', 'sports', 'daily', 'party', 'work', NULL)),
ADD COLUMN IF NOT EXISTS style_keywords text[];

-- 2. Embedding Status Tracking
ALTER TABLE products
ADD COLUMN IF NOT EXISTS embedding_status text DEFAULT 'missing' CHECK (embedding_status IN ('missing', 'pending', 'completed', 'failed', 'outdated')),
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS embedding_error text;

-- Create index for filtering by embedding status
CREATE INDEX IF NOT EXISTS products_embedding_status_idx ON products(embedding_status);

-- 3. Embedding Jobs Queue Table
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS embedding_jobs_status_idx ON embedding_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS embedding_jobs_product_idx ON embedding_jobs(product_id);

-- 4. Function to queue embedding job
CREATE OR REPLACE FUNCTION queue_embedding_job()
RETURNS trigger AS $$
BEGIN
  -- Check if product fields that affect embedding have changed
  IF (TG_OP = 'INSERT') OR
     (TG_OP = 'UPDATE' AND (
       NEW.title IS DISTINCT FROM OLD.title OR
       NEW.description IS DISTINCT FROM OLD.description OR
       NEW.category IS DISTINCT FROM OLD.category OR
       NEW.tags IS DISTINCT FROM OLD.tags OR
       NEW.season IS DISTINCT FROM OLD.season OR
       NEW.fabric IS DISTINCT FROM OLD.fabric OR
       NEW.usage IS DISTINCT FROM OLD.usage OR
       NEW.style_keywords IS DISTINCT FROM OLD.style_keywords
     )) THEN
    
    -- Update embedding status to pending
    NEW.embedding_status := 'pending';
    
    -- Insert job into queue (if not already pending for this product)
    INSERT INTO embedding_jobs (product_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-queue embedding jobs
DROP TRIGGER IF EXISTS trigger_queue_embedding ON products;
CREATE TRIGGER trigger_queue_embedding
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION queue_embedding_job();

-- 5. Mark existing products as needing embeddings
UPDATE products 
SET embedding_status = 'pending'
WHERE embedding IS NULL AND is_active = true;

-- Queue jobs for existing products without embeddings
INSERT INTO embedding_jobs (product_id, status)
SELECT id, 'pending'
FROM products
WHERE embedding IS NULL 
  AND is_active = true
ON CONFLICT DO NOTHING;

-- Add comments
COMMENT ON COLUMN products.season IS 'Product season category for semantic search (summer/winter/monsoon/all-season)';
COMMENT ON COLUMN products.fabric IS 'Fabric materials array (cotton, wool, polyester, etc.) for enhanced search';
COMMENT ON COLUMN products.usage IS 'Product usage context (casual/formal/sports/daily/party/work)';
COMMENT ON COLUMN products.style_keywords IS 'Style descriptors (comfortable, breathable, warm, etc.) for semantic understanding';
COMMENT ON COLUMN products.embedding_status IS 'Status of AI embedding generation (missing/pending/completed/failed/outdated)';
COMMENT ON TABLE embedding_jobs IS 'Queue for asynchronous AI embedding generation jobs';
