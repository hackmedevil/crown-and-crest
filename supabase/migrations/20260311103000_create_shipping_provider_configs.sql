-- Configurable shipping providers for admin shipping control panel

CREATE TABLE IF NOT EXISTS shipping_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_base_url TEXT,
  auth_type TEXT,
  auth_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  operational_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  last_test_status TEXT,
  last_test_message TEXT,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_provider_configs_enabled ON shipping_provider_configs(is_enabled);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_shipping_provider_configs_updated_at ON shipping_provider_configs;
    CREATE TRIGGER trg_shipping_provider_configs_updated_at
      BEFORE UPDATE ON shipping_provider_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

INSERT INTO shipping_provider_configs (
  provider_key,
  provider_name,
  is_enabled,
  api_base_url,
  auth_type,
  auth_config,
  operational_config,
  notes
)
VALUES (
  'supplier_direct',
  'Supplier Direct',
  FALSE,
  NULL,
  'qikink_token',
  jsonb_build_object('api_key', '', 'api_secret', '', 'webhook_secret', ''),
  jsonb_build_object(
    'supports_cod', TRUE,
    'supports_prepaid', TRUE,
    'serviceable_regions', ARRAY[]::text[],
    'default_dispatch_days', 2,
    'fallback_to_shiprocket', TRUE
  ),
  'Use this profile for Qikink-like or other supplier shipping APIs.'
)
ON CONFLICT (provider_key) DO NOTHING;
