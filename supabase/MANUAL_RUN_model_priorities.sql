-- ⚠️ MANUAL EXECUTION REQUIRED
-- Run this SQL directly in your Supabase SQL Editor if migrations are not syncing
-- Dashboard → SQL Editor → New Query → Paste this → Run

-- Create ai_model_priorities table if it doesn't exist
CREATE TABLE IF NOT EXISTS ai_model_priorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_id VARCHAR(255) NOT NULL,
    priority INTEGER CHECK (priority BETWEEN 1 AND 10),
    is_enabled BOOLEAN DEFAULT true,
    last_tested_at TIMESTAMP,
    test_latency_ms INTEGER,
    test_success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider_id, model_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_model_priorities_provider ON ai_model_priorities(provider_id);
CREATE INDEX IF NOT EXISTS idx_model_priorities_priority ON ai_model_priorities(provider_id, priority) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_model_priorities_success ON ai_model_priorities(provider_id, test_success, test_latency_ms);

-- Add comments
COMMENT ON TABLE ai_model_priorities IS 'Individual model priorities for testing and failover management';
COMMENT ON COLUMN ai_model_priorities.priority IS 'Priority level (1-10, lower is higher priority)';
COMMENT ON COLUMN ai_model_priorities.is_enabled IS 'Whether this model is enabled for use';
COMMENT ON COLUMN ai_model_priorities.test_latency_ms IS 'Last measured latency in milliseconds';
COMMENT ON COLUMN ai_model_priorities.test_success IS 'Result of last ping test';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_model_priority_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS trigger_update_model_priority_timestamp ON ai_model_priorities;

-- Create trigger
CREATE TRIGGER trigger_update_model_priority_timestamp
    BEFORE UPDATE ON ai_model_priorities
    FOR EACH ROW
    EXECUTE FUNCTION update_model_priority_timestamp();

-- Verify table was created
SELECT 'ai_model_priorities table created successfully!' AS status;
SELECT COUNT(*) AS table_exists FROM information_schema.tables 
WHERE table_name = 'ai_model_priorities';
