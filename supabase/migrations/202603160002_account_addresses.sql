-- Customer saved addresses for account area and checkout

CREATE TABLE IF NOT EXISTS account_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  country text NOT NULL DEFAULT 'India',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_addresses_uid_created
  ON account_addresses(firebase_uid, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_account_addresses_single_default
  ON account_addresses(firebase_uid)
  WHERE is_default = true;
