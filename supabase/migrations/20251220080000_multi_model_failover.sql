-- Multi-Model Failover & Notifications Migration
-- Add support for multiple models, health monitoring, and notifications

-- 1. Add multi-model support to ai_api_keys
ALTER TABLE ai_api_keys
ADD COLUMN IF NOT EXISTS selected_models JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS model_priority JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS health_status JSONB DEFAULT '{}';

-- 2. Migrate existing selected_model to selected_models array
UPDATE ai_api_keys
SET selected_models = CASE 
    WHEN selected_model IS NOT NULL AND selected_model != '' 
    THEN jsonb_build_array(selected_model)
    ELSE '[]'::jsonb
END,
model_priority = CASE 
    WHEN selected_model IS NOT NULL AND selected_model != '' 
    THEN jsonb_build_array(selected_model)
    ELSE '[]'::jsonb
END
WHERE selected_models = '[]'::jsonb;

-- 3. Create AI notifications table
CREATE TABLE IF NOT EXISTS ai_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,  -- 'model_deleted', 'rate_limit', 'failover', 'health_check_failed'
    severity VARCHAR(20) NOT NULL,  -- 'info', 'warning', 'error', 'critical'
    provider_id UUID REFERENCES ai_providers(id) ON DELETE CASCADE,
    model_id VARCHAR(255),
    message TEXT NOT NULL,
    details JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- 4. Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON ai_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_provider ON ai_notifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON ai_notifications(expires_at);

-- 5. Create AI usage log table for tracking
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    model_id VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    error_type VARCHAR(50),  -- 'rate_limit', 'quota_exceeded', 'model_not_found', etc.
    latency_ms INTEGER,
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Create indexes for usage log
CREATE INDEX IF NOT EXISTS idx_usage_provider_model ON ai_usage_log(provider, model_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_success ON ai_usage_log(success, created_at DESC);

-- 7. Add comment for documentation
COMMENT ON TABLE ai_notifications IS 'Stores AI-related notifications for users (rate limits, model deletions, failovers)';
COMMENT ON TABLE ai_usage_log IS 'Tracks AI model usage for analytics and failover decisions';
COMMENT ON COLUMN ai_api_keys.selected_models IS 'Array of model IDs that are selected for use';
COMMENT ON COLUMN ai_api_keys.model_priority IS 'Ordered array of model IDs for failover priority';
COMMENT ON COLUMN ai_api_keys.health_status IS 'JSON object tracking health status of each model';
