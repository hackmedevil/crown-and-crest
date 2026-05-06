-- MANUAL FIX: Run this SQL directly in your Supabase SQL Editor
-- This fixes the "column product_id does not exist" error

-- 1. Create the embedding_jobs table
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('product', 'search_query')),
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT embedding_jobs_entity_unique UNIQUE (entity_type, entity_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS embedding_jobs_processing_idx 
  ON embedding_jobs(status, priority DESC, created_at ASC)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS embedding_jobs_failed_idx
  ON embedding_jobs(status, attempts DESC)
  WHERE status = 'failed';

-- 3. Create timestamp trigger
CREATE OR REPLACE FUNCTION update_embedding_job_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.processed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_embedding_job_timestamp ON embedding_jobs;
CREATE TRIGGER trigger_update_embedding_job_timestamp
  BEFORE UPDATE ON embedding_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_embedding_job_timestamp();

-- 4. Update the existing queue_embedding_job function
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

    -- Updated to use entity_type and entity_id instead of product_id
    INSERT INTO embedding_jobs (entity_type, entity_id, status)
    VALUES ('product', NEW.id::text, 'pending')
    ON CONFLICT (entity_type, entity_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Embedding jobs table created and trigger updated successfully!';
END $$;
