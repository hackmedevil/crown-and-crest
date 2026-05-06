-- Add provider-specific configuration storage
ALTER TABLE ai_api_keys ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::jsonb;

-- Add model selection to api_keys
ALTER TABLE ai_api_keys ADD COLUMN IF NOT EXISTS selected_model TEXT;

-- Update comment
COMMENT ON COLUMN ai_api_keys.config_json IS 'Provider-specific configuration (e.g., organization ID for OpenAI, API version for Anthropic)';
COMMENT ON COLUMN ai_api_keys.selected_model IS 'Selected model for this API key';
