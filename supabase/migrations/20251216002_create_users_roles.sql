-- ============================================
-- MINIMAL ROLE SYSTEM FOR CROWN AND CREST
-- ============================================
-- 
-- Creates a users table with role field for admin access control.
-- Roles: 'customer' (default), 'admin'
--
-- Note: This table is separate from Firebase Auth.
-- Firebase handles authentication, Supabase handles authorization.
-- ============================================

-- 1️⃣ Create ENUM for user roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2️⃣ Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text UNIQUE NOT NULL,
  email text,
  phone text,
  role user_role NOT NULL DEFAULT 'customer',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3️⃣ Add role column if table exists but column doesn't
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'customer';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 4️⃣ Create index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- 5️⃣ Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USAGE NOTES
-- ============================================
--
-- 1. By default, all users are 'customer'
-- 2. To promote a user to admin:
--    INSERT INTO users (firebase_uid, role) 
--    VALUES ('firebase_uid_here', 'admin')
--    ON CONFLICT (firebase_uid) 
--    DO UPDATE SET role = 'admin';
--
-- 3. To demote an admin back to customer:
--    UPDATE users SET role = 'customer' 
--    WHERE firebase_uid = 'firebase_uid_here';
--
-- ============================================
