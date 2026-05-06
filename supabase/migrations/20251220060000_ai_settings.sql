-- AI Settings Infrastructure
-- Supports multiple AI providers with encrypted API key storage

-- AI Providers table
CREATE TABLE IF NOT EXISTS ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'openrouter', 'openai', 'anthropic', 'google'
  display_name TEXT NOT NULL,
  base_url TEXT, -- API endpoint
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encrypted API keys per provider (allows multiple keys per provider)
CREATE TABLE IF NOT EXISTS ai_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_providers(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  label TEXT, -- Optional label like "Production Key" or "Test Key"
  is_active BOOLEAN DEFAULT false, -- Only one active key per provider
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id, label)
);

-- AI presets/configurations per provider
CREATE TABLE IF NOT EXISTS ai_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES ai_providers(id) ON DELETE CASCADE,
  preset_name TEXT NOT NULL,
  model_name TEXT, -- e.g., 'gpt-4', 'claude-3-opus'
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  config_json JSONB, -- Additional provider-specific config
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default AI providers with correct endpoints
INSERT INTO ai_providers (name, display_name, base_url) VALUES
  ('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1'),
  ('openai', 'OpenAI', 'https://api.openai.com/v1'),
  ('anthropic', 'Anthropic', 'https://api.anthropic.com/v1'),
  ('google', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta'),
  ('cohere', 'Cohere', 'https://api.cohere.ai/v1')
ON CONFLICT (name) DO NOTHING;

-- Insert default presets for each provider
INSERT INTO ai_presets (provider_id, preset_name, model_name, temperature, max_tokens, is_default) 
SELECT 
  id,
  'Default',
  CASE name
    WHEN 'openrouter' THEN 'meta-llama/llama-3.1-8b-instruct:free'
    WHEN 'openai' THEN 'gpt-3.5-turbo'
    WHEN 'anthropic' THEN 'claude-3-haiku-20240307'
    WHEN 'google' THEN 'gemini-1.5-flash'
    WHEN 'cohere' THEN 'command-r'
  END,
  0.7,
  1000,
  true
FROM ai_providers
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_provider ON ai_api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_api_keys_active ON ai_api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_presets_provider ON ai_presets(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_presets_default ON ai_presets(is_default) WHERE is_default = true;

-- Add updated_at trigger for ai_providers
CREATE OR REPLACE FUNCTION update_ai_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_providers_updated_at
  BEFORE UPDATE ON ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_providers_updated_at();

-- Add updated_at trigger for ai_api_keys
CREATE OR REPLACE FUNCTION update_ai_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_api_keys_updated_at
  BEFORE UPDATE ON ai_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_api_keys_updated_at();

COMMENT ON TABLE ai_providers IS 'Supported AI providers for content generation and analysis';
COMMENT ON TABLE ai_api_keys IS 'Encrypted API keys for AI providers - supports multiple keys per provider';
COMMENT ON TABLE ai_presets IS 'Saved AI model configurations and presets';
