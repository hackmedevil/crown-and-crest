-- Account Overview Data Tables
-- Adds supporting tables for wishlist, rewards, offers, wallet, recommendations, and recently viewed

-- Extend users table with profile fields
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Rewards
CREATE TABLE IF NOT EXISTS account_rewards (
  firebase_uid text PRIMARY KEY REFERENCES users(firebase_uid) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'Starter',
  tier_progress integer NOT NULL DEFAULT 0 CHECK (tier_progress >= 0 AND tier_progress <= 100),
  referral_code text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Wallet
CREATE TABLE IF NOT EXISTS account_wallets (
  firebase_uid text PRIMARY KEY REFERENCES users(firebase_uid) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Savings
CREATE TABLE IF NOT EXISTS account_savings (
  firebase_uid text PRIMARY KEY REFERENCES users(firebase_uid) ON DELETE CASCADE,
  total_saved integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Offers
CREATE TABLE IF NOT EXISTS account_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  offer_code text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_offers_user ON account_offers(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_account_offers_status ON account_offers(status);

-- Wishlist
CREATE TABLE IF NOT EXISTS account_wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_alert boolean NOT NULL DEFAULT false,
  stock_alert boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firebase_uid, product_id)
);

CREATE INDEX IF NOT EXISTS idx_account_wishlist_user ON account_wishlist_items(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_account_wishlist_product ON account_wishlist_items(product_id);

-- Recommendations
CREATE TABLE IF NOT EXISTS account_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_recommendations_user ON account_recommendations(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_account_recommendations_product ON account_recommendations(product_id);

-- Recently viewed
CREATE TABLE IF NOT EXISTS account_recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES users(firebase_uid) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firebase_uid, product_id)
);

CREATE INDEX IF NOT EXISTS idx_account_recently_viewed_user ON account_recently_viewed(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_account_recently_viewed_viewed_at ON account_recently_viewed(viewed_at);

-- Updated at triggers
DROP TRIGGER IF EXISTS account_rewards_updated_at ON account_rewards;
CREATE TRIGGER account_rewards_updated_at
  BEFORE UPDATE ON account_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS account_wallets_updated_at ON account_wallets;
CREATE TRIGGER account_wallets_updated_at
  BEFORE UPDATE ON account_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS account_savings_updated_at ON account_savings;
CREATE TRIGGER account_savings_updated_at
  BEFORE UPDATE ON account_savings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE account_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recently_viewed ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist to make migration idempotent
DROP POLICY IF EXISTS "account_rewards_select_own" ON account_rewards;
DROP POLICY IF EXISTS "account_rewards_update_own" ON account_rewards;
DROP POLICY IF EXISTS "account_rewards_insert_own" ON account_rewards;
DROP POLICY IF EXISTS "account_wallets_select_own" ON account_wallets;
DROP POLICY IF EXISTS "account_wallets_update_own" ON account_wallets;
DROP POLICY IF EXISTS "account_wallets_insert_own" ON account_wallets;
DROP POLICY IF EXISTS "account_savings_select_own" ON account_savings;
DROP POLICY IF EXISTS "account_savings_update_own" ON account_savings;
DROP POLICY IF EXISTS "account_savings_insert_own" ON account_savings;
DROP POLICY IF EXISTS "account_offers_select_own" ON account_offers;
DROP POLICY IF EXISTS "account_offers_insert_own" ON account_offers;
DROP POLICY IF EXISTS "account_offers_update_own" ON account_offers;
DROP POLICY IF EXISTS "account_offers_delete_own" ON account_offers;
DROP POLICY IF EXISTS "account_wishlist_select_own" ON account_wishlist_items;
DROP POLICY IF EXISTS "account_wishlist_insert_own" ON account_wishlist_items;
DROP POLICY IF EXISTS "account_wishlist_delete_own" ON account_wishlist_items;
DROP POLICY IF EXISTS "account_recommendations_select_own" ON account_recommendations;
DROP POLICY IF EXISTS "account_recommendations_insert_own" ON account_recommendations;
DROP POLICY IF EXISTS "account_recommendations_delete_own" ON account_recommendations;
DROP POLICY IF EXISTS "account_recently_viewed_select_own" ON account_recently_viewed;
DROP POLICY IF EXISTS "account_recently_viewed_insert_own" ON account_recently_viewed;
DROP POLICY IF EXISTS "account_recently_viewed_update_own" ON account_recently_viewed;
DROP POLICY IF EXISTS "account_recently_viewed_delete_own" ON account_recently_viewed;

-- Rewards policies
CREATE POLICY "account_rewards_select_own" ON account_rewards
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "account_rewards_update_own" ON account_rewards
  FOR UPDATE
  USING (firebase_uid = auth.uid()::text)
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_rewards_insert_own" ON account_rewards
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

-- Wallet policies
CREATE POLICY "account_wallets_select_own" ON account_wallets
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "account_wallets_update_own" ON account_wallets
  FOR UPDATE
  USING (firebase_uid = auth.uid()::text)
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_wallets_insert_own" ON account_wallets
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

-- Savings policies
CREATE POLICY "account_savings_select_own" ON account_savings
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "account_savings_update_own" ON account_savings
  FOR UPDATE
  USING (firebase_uid = auth.uid()::text)
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_savings_insert_own" ON account_savings
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

-- Offers policies
CREATE POLICY "account_offers_select_own" ON account_offers
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "account_offers_insert_own" ON account_offers
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_offers_update_own" ON account_offers
  FOR UPDATE
  USING (firebase_uid = auth.uid()::text)
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_offers_delete_own" ON account_offers
  FOR DELETE
  USING (firebase_uid = auth.uid()::text);

-- Wishlist policies
CREATE POLICY "account_wishlist_select_own" ON account_wishlist_items
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "account_wishlist_insert_own" ON account_wishlist_items
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_wishlist_delete_own" ON account_wishlist_items
  FOR DELETE
  USING (firebase_uid = auth.uid()::text);

-- Recommendations policies
CREATE POLICY "account_recommendations_select_own" ON account_recommendations
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "account_recommendations_insert_own" ON account_recommendations
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_recommendations_delete_own" ON account_recommendations
  FOR DELETE
  USING (firebase_uid = auth.uid()::text);

-- Recently viewed policies
CREATE POLICY "account_recently_viewed_select_own" ON account_recently_viewed
  FOR SELECT
  USING (firebase_uid = auth.uid()::text);

CREATE POLICY "account_recently_viewed_insert_own" ON account_recently_viewed
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_recently_viewed_update_own" ON account_recently_viewed
  FOR UPDATE
  USING (firebase_uid = auth.uid()::text)
  WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "account_recently_viewed_delete_own" ON account_recently_viewed
  FOR DELETE
  USING (firebase_uid = auth.uid()::text);
