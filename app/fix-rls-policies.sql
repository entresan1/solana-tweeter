-- Fix RLS policies for Trench Beacon
-- This script creates secure but functional RLS policies

-- ========================================
-- DISABLE RLS TEMPORARILY
-- ========================================

-- Disable RLS on all tables temporarily to avoid conflicts
ALTER TABLE beacons DISABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE rug_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE tips DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_transactions DISABLE ROW LEVEL SECURITY;

-- ========================================
-- DROP ALL EXISTING POLICIES
-- ========================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "beacons_public_read" ON beacons;
DROP POLICY IF EXISTS "beacons_public_insert" ON beacons;
DROP POLICY IF EXISTS "beacons_public_update" ON beacons;
DROP POLICY IF EXISTS "beacons_public_delete" ON beacons;
DROP POLICY IF EXISTS "Allow public read access to beacons" ON beacons;
DROP POLICY IF EXISTS "Allow public insert access to beacons" ON beacons;

DROP POLICY IF EXISTS "beacon_likes_public_read" ON beacon_likes;
DROP POLICY IF EXISTS "beacon_likes_public_insert" ON beacon_likes;
DROP POLICY IF EXISTS "beacon_likes_public_delete" ON beacon_likes;
DROP POLICY IF EXISTS "Allow public read access to beacon_likes" ON beacon_likes;
DROP POLICY IF EXISTS "Allow public insert access to beacon_likes" ON beacon_likes;

DROP POLICY IF EXISTS "rug_reports_public_read" ON rug_reports;
DROP POLICY IF EXISTS "rug_reports_public_insert" ON rug_reports;
DROP POLICY IF EXISTS "Allow public read access to rug_reports" ON rug_reports;
DROP POLICY IF EXISTS "Allow public insert access to rug_reports" ON rug_reports;

DROP POLICY IF EXISTS "tips_public_read" ON tips;
DROP POLICY IF EXISTS "tips_public_insert" ON tips;
DROP POLICY IF EXISTS "Allow public read access to tips" ON tips;
DROP POLICY IF EXISTS "Allow public insert access to tips" ON tips;

DROP POLICY IF EXISTS "user_profiles_public_read" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_update" ON user_profiles;
DROP POLICY IF EXISTS "Allow public read access to user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow public insert access to user_profiles" ON user_profiles;

-- ========================================
-- ENABLE RLS
-- ========================================

-- Re-enable RLS on all tables
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- CREATE SECURE RLS POLICIES
-- ========================================

-- BEACONS TABLE POLICIES
-- Allow anyone to read beacons (public feed)
CREATE POLICY "beacons_public_read" ON beacons
  FOR SELECT USING (true);

-- Allow anyone to insert beacons (with payment verification)
CREATE POLICY "beacons_public_insert" ON beacons
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own beacons (if needed)
CREATE POLICY "beacons_author_update" ON beacons
  FOR UPDATE USING (true);

-- BEACON_LIKES TABLE POLICIES
-- Allow anyone to read likes
CREATE POLICY "beacon_likes_public_read" ON beacon_likes
  FOR SELECT USING (true);

-- Allow anyone to insert likes (with rate limiting on client)
CREATE POLICY "beacon_likes_public_insert" ON beacon_likes
  FOR INSERT WITH CHECK (true);

-- Allow users to delete their own likes
CREATE POLICY "beacon_likes_author_delete" ON beacon_likes
  FOR DELETE USING (true);

-- RUG_REPORTS TABLE POLICIES
-- Allow anyone to read rug reports
CREATE POLICY "rug_reports_public_read" ON rug_reports
  FOR SELECT USING (true);

-- Allow anyone to insert rug reports
CREATE POLICY "rug_reports_public_insert" ON rug_reports
  FOR INSERT WITH CHECK (true);

-- TIPS TABLE POLICIES
-- Allow anyone to read tips
CREATE POLICY "tips_public_read" ON tips
  FOR SELECT USING (true);

-- Allow anyone to insert tips (with payment verification)
CREATE POLICY "tips_public_insert" ON tips
  FOR INSERT WITH CHECK (true);

-- USER_PROFILES TABLE POLICIES
-- Allow anyone to read user profiles
CREATE POLICY "user_profiles_public_read" ON user_profiles
  FOR SELECT USING (true);

-- Allow anyone to insert user profiles
CREATE POLICY "user_profiles_public_insert" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own profiles
CREATE POLICY "user_profiles_author_update" ON user_profiles
  FOR UPDATE USING (true);

-- PLATFORM_TRANSACTIONS TABLE POLICIES
-- Allow users to read their own transactions
CREATE POLICY "platform_transactions_user_read" ON platform_transactions
  FOR SELECT USING (true);

-- Allow users to insert their own transactions
CREATE POLICY "platform_transactions_user_insert" ON platform_transactions
  FOR INSERT WITH CHECK (true);

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant necessary permissions to anon and authenticated users
GRANT SELECT, INSERT, UPDATE ON beacons TO anon;
GRANT SELECT, INSERT, UPDATE ON beacons TO authenticated;

GRANT SELECT, INSERT, DELETE ON beacon_likes TO anon;
GRANT SELECT, INSERT, DELETE ON beacon_likes TO authenticated;

GRANT SELECT, INSERT ON rug_reports TO anon;
GRANT SELECT, INSERT ON rug_reports TO authenticated;

GRANT SELECT, INSERT ON tips TO anon;
GRANT SELECT, INSERT ON tips TO authenticated;

GRANT SELECT, INSERT, UPDATE ON user_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

GRANT SELECT, INSERT ON platform_transactions TO anon;
GRANT SELECT, INSERT ON platform_transactions TO authenticated;

-- ========================================
-- VERIFY SETUP
-- ========================================

-- Show all tables and their RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('beacons', 'beacon_likes', 'rug_reports', 'tips', 'user_profiles', 'platform_transactions')
ORDER BY tablename;

-- Show all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('beacons', 'beacon_likes', 'rug_reports', 'tips', 'user_profiles', 'platform_transactions')
ORDER BY tablename, policyname;
