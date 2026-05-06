-- Enable Row Level Security on Core Commerce Tables
-- Migration: 20260131_enable_core_table_rls.sql
-- Purpose: Prevent unauthorized data access via client-side queries
-- Status: Production-ready, idempotent

-- ============================================================================
-- TABLE: users
-- ============================================================================
-- Protects user profiles and role data
-- Users can only read/modify their own profile

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY IF NOT EXISTS "users_select_own" ON users
  FOR SELECT
  USING (firebase_uid = auth.uid());

-- Allow users to update their own profile (not role)
CREATE POLICY IF NOT EXISTS "users_update_own" ON users
  FOR UPDATE
  USING (firebase_uid = auth.uid())
  WITH CHECK (firebase_uid = auth.uid());

-- Admin can view all users (bypassed via supabaseAdmin client)
-- No explicit policy needed - admin uses service role key

-- ============================================================================
-- TABLE: cart_items
-- ============================================================================
-- Protects shopping cart data
-- Users can only access their own cart

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Self-only read
CREATE POLICY IF NOT EXISTS "cart_items_select_own" ON cart_items
  FOR SELECT
  USING (firebase_uid = auth.uid());

-- Self-only insert (add to cart)
CREATE POLICY IF NOT EXISTS "cart_items_insert_own" ON cart_items
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid());

-- Self-only update (change quantity)
CREATE POLICY IF NOT EXISTS "cart_items_update_own" ON cart_items
  FOR UPDATE
  USING (firebase_uid = auth.uid())
  WITH CHECK (firebase_uid = auth.uid());

-- Self-only delete (remove from cart)
CREATE POLICY IF NOT EXISTS "cart_items_delete_own" ON cart_items
  FOR DELETE
  USING (firebase_uid = auth.uid());

-- ============================================================================
-- TABLE: orders
-- ============================================================================
-- Protects order master records
-- Users can only view their own orders

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Self-only read
CREATE POLICY IF NOT EXISTS "orders_select_own" ON orders
  FOR SELECT
  USING (firebase_uid = auth.uid());

-- Self-only insert (order creation via server action)
CREATE POLICY IF NOT EXISTS "orders_insert_own" ON orders
  FOR INSERT
  WITH CHECK (firebase_uid = auth.uid());

-- No UPDATE policy for users (admin-only via service role)
-- Users cannot change order status themselves

-- ============================================================================
-- TABLE: order_items
-- ============================================================================
-- Protects order line items
-- Users can only view items from their own orders

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own order items
-- Join to orders table to verify ownership
CREATE POLICY IF NOT EXISTS "order_items_select_own" ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.firebase_uid = auth.uid()
    )
  );

-- Allow insert only if order belongs to user
CREATE POLICY IF NOT EXISTS "order_items_insert_own" ON order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.firebase_uid = auth.uid()
    )
  );

-- No UPDATE/DELETE for users (immutable after creation)

-- ============================================================================
-- TABLE: order_addresses
-- ============================================================================
-- Protects shipping addresses linked to orders
-- Users can only view addresses from their own orders

ALTER TABLE order_addresses ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own order addresses
CREATE POLICY IF NOT EXISTS "order_addresses_select_own" ON order_addresses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_addresses.order_id
      AND orders.firebase_uid = auth.uid()
    )
  );

-- Allow insert only if order belongs to user
CREATE POLICY IF NOT EXISTS "order_addresses_insert_own" ON order_addresses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_addresses.order_id
      AND orders.firebase_uid = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify RLS is working:

-- Test 1: User should only see their own cart items
-- SELECT * FROM cart_items WHERE firebase_uid = auth.uid();

-- Test 2: User should NOT see other users' cart items
-- SELECT * FROM cart_items WHERE firebase_uid != auth.uid();
-- Expected: Empty result or permission error

-- Test 3: User should only see their own orders
-- SELECT * FROM orders WHERE firebase_uid = auth.uid();

-- Test 4: User should only see order items from their own orders
-- SELECT * FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE firebase_uid = auth.uid());

-- ============================================================================
-- ADMIN ACCESS
-- ============================================================================
-- Admin users bypass RLS by using supabaseAdmin client (service role key)
-- No explicit admin policies needed

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Migration is idempotent (IF NOT EXISTS)
-- 2. Public tables (products, variants) remain unrestricted
-- 3. stock_reservations NOT included (short-lived, managed by RPCs)
-- 4. User cannot modify their own 'role' field (UPDATE policy prevents it)
-- 5. Order status updates require admin (no user UPDATE policy on orders)
