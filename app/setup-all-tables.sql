-- Complete database setup for Solana Twitter app
-- This script creates all required tables with proper structure

-- ========================================
-- BEACONS TABLE
-- ========================================

-- Create beacons table if it doesn't exist
CREATE TABLE IF NOT EXISTS beacons (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_display TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  treasury_transaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add platform_wallet column if it doesn't exist
ALTER TABLE beacons ADD COLUMN IF NOT EXISTS platform_wallet BOOLEAN DEFAULT FALSE;

-- Create indexes for beacons
CREATE INDEX IF NOT EXISTS idx_beacons_timestamp ON beacons(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_beacons_author ON beacons(author);
CREATE INDEX IF NOT EXISTS idx_beacons_topic ON beacons(topic);
CREATE INDEX IF NOT EXISTS idx_beacons_platform_wallet ON beacons(platform_wallet);

-- Enable RLS for beacons
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;

-- Create policies for beacons
DROP POLICY IF EXISTS "Anyone can read beacons" ON beacons;
DROP POLICY IF EXISTS "Anyone can insert beacons" ON beacons;
CREATE POLICY "Anyone can read beacons" ON beacons FOR SELECT USING (true);
CREATE POLICY "Anyone can insert beacons" ON beacons FOR INSERT WITH CHECK (true);

-- ========================================
-- BEACON LIKES TABLE
-- ========================================

-- Create beacon_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS beacon_likes (
  id SERIAL PRIMARY KEY,
  beacon_id INTEGER NOT NULL,
  user_wallet VARCHAR(44) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(beacon_id, user_wallet)
);

-- Create indexes for beacon_likes
CREATE INDEX IF NOT EXISTS idx_beacon_likes_beacon_id ON beacon_likes(beacon_id);
CREATE INDEX IF NOT EXISTS idx_beacon_likes_user ON beacon_likes(user_wallet);

-- Enable RLS for beacon_likes
ALTER TABLE beacon_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for beacon_likes
DROP POLICY IF EXISTS "beacon_likes_public_read" ON beacon_likes;
DROP POLICY IF EXISTS "beacon_likes_public_insert" ON beacon_likes;
DROP POLICY IF EXISTS "beacon_likes_public_delete" ON beacon_likes;
CREATE POLICY "beacon_likes_public_read" ON beacon_likes FOR SELECT USING (true);
CREATE POLICY "beacon_likes_public_insert" ON beacon_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "beacon_likes_public_delete" ON beacon_likes FOR DELETE USING (true);

-- ========================================
-- RUG REPORTS TABLE
-- ========================================

-- Create rug_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS rug_reports (
  id SERIAL PRIMARY KEY,
  beacon_id INTEGER NOT NULL,
  reporter_wallet VARCHAR(44) NOT NULL,
  reporter_display VARCHAR(50) NOT NULL,
  reason TEXT DEFAULT '',
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for rug_reports
CREATE INDEX IF NOT EXISTS idx_rug_reports_beacon_id ON rug_reports(beacon_id);
CREATE INDEX IF NOT EXISTS idx_rug_reports_reporter ON rug_reports(reporter_wallet);
CREATE INDEX IF NOT EXISTS idx_rug_reports_timestamp ON rug_reports(timestamp DESC);

-- Enable RLS for rug_reports
ALTER TABLE rug_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for rug_reports
DROP POLICY IF EXISTS "Anyone can read rug_reports" ON rug_reports;
DROP POLICY IF EXISTS "Anyone can insert rug_reports" ON rug_reports;
CREATE POLICY "Anyone can read rug_reports" ON rug_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rug_reports" ON rug_reports FOR INSERT WITH CHECK (true);

-- ========================================
-- TIPS TABLE
-- ========================================

-- Create tips table if it doesn't exist
CREATE TABLE IF NOT EXISTS tips (
  id SERIAL PRIMARY KEY,
  recipient VARCHAR(44) NOT NULL,
  amount DECIMAL(10, 6) NOT NULL,
  message TEXT DEFAULT '',
  beacon_id INTEGER NOT NULL,
  tipper VARCHAR(44) NOT NULL,
  tipper_display VARCHAR(50) NOT NULL,
  timestamp BIGINT NOT NULL,
  treasury_transaction VARCHAR(88) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add platform_wallet column if it doesn't exist
ALTER TABLE tips ADD COLUMN IF NOT EXISTS platform_wallet BOOLEAN DEFAULT FALSE;

-- Create indexes for tips
CREATE INDEX IF NOT EXISTS idx_tips_recipient ON tips(recipient);
CREATE INDEX IF NOT EXISTS idx_tips_beacon_id ON tips(beacon_id);
CREATE INDEX IF NOT EXISTS idx_tips_tipper ON tips(tipper);
CREATE INDEX IF NOT EXISTS idx_tips_timestamp ON tips(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tips_platform_wallet ON tips(platform_wallet);

-- Enable RLS for tips
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Create policies for tips
DROP POLICY IF EXISTS "Anyone can read tips" ON tips;
DROP POLICY IF EXISTS "Anyone can insert tips" ON tips;
CREATE POLICY "Anyone can read tips" ON tips FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tips" ON tips FOR INSERT WITH CHECK (true);

-- ========================================
-- USER PROFILES TABLE
-- ========================================

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet ON user_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

-- Enable RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
DROP POLICY IF EXISTS "user_profiles_public_read" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_update" ON user_profiles;
CREATE POLICY "user_profiles_public_read" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "user_profiles_public_insert" ON user_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "user_profiles_public_update" ON user_profiles FOR UPDATE USING (true);

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant permissions to anon and authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON beacons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON beacons TO authenticated;
GRANT SELECT, INSERT, DELETE ON beacon_likes TO anon;
GRANT SELECT, INSERT, DELETE ON beacon_likes TO authenticated;
GRANT SELECT, INSERT ON rug_reports TO anon;
GRANT SELECT, INSERT ON rug_reports TO authenticated;
GRANT SELECT, INSERT ON tips TO anon;
GRANT SELECT, INSERT ON tips TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;

-- ========================================
-- VERIFY SETUP
-- ========================================

-- Show all tables and their columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('beacons', 'beacon_likes', 'rug_reports', 'tips', 'user_profiles')
ORDER BY table_name, ordinal_position;
