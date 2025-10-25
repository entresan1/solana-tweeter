-- Safe database schema for Trench Beacon
-- This version handles existing policies and tables gracefully

-- Create beacons table for Trench Beacon
CREATE TABLE IF NOT EXISTS beacons (
  id SERIAL PRIMARY KEY,
  topic VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(44) NOT NULL, -- Solana public key (base58)
  author_display VARCHAR(20) NOT NULL,
  timestamp BIGINT NOT NULL,
  treasury_transaction VARCHAR(88) NOT NULL, -- Solana transaction signature
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_beacons_author ON beacons(author);
CREATE INDEX IF NOT EXISTS idx_beacons_topic ON beacons(topic);
CREATE INDEX IF NOT EXISTS idx_beacons_timestamp ON beacons(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_beacons_treasury_transaction ON beacons(treasury_transaction);

-- Enable Row Level Security (RLS)
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (with IF EXISTS)
DROP POLICY IF EXISTS "beacons_public_read" ON beacons;
DROP POLICY IF EXISTS "beacons_public_insert" ON beacons;
DROP POLICY IF EXISTS "Allow public read access to beacons" ON beacons;
DROP POLICY IF EXISTS "Allow public insert access to beacons" ON beacons;

-- Create policy to allow anyone to read beacons
CREATE POLICY "beacons_public_read" ON beacons
  FOR SELECT USING (true);

-- Create policy to allow anyone to insert beacons (for creating new beacons)
CREATE POLICY "beacons_public_insert" ON beacons
  FOR INSERT WITH CHECK (true);

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(44) NOT NULL UNIQUE, -- Solana public key
  nickname VARCHAR(50),
  profile_picture_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet ON user_profiles(wallet_address);

-- Enable RLS for user profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_profiles_public_read" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_update" ON user_profiles;
DROP POLICY IF EXISTS "Allow public read access to user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON user_profiles;

-- Create policies for user profiles
CREATE POLICY "user_profiles_public_read" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "user_profiles_public_insert" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_profiles_public_update" ON user_profiles
  FOR UPDATE USING (true);

-- Create likes table
CREATE TABLE IF NOT EXISTS beacon_likes (
  id SERIAL PRIMARY KEY,
  beacon_id INTEGER NOT NULL REFERENCES beacons(id) ON DELETE CASCADE,
  user_wallet VARCHAR(44) NOT NULL, -- Solana public key
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(beacon_id, user_wallet)
);

-- Create replies table
CREATE TABLE IF NOT EXISTS beacon_replies (
  id SERIAL PRIMARY KEY,
  beacon_id INTEGER NOT NULL REFERENCES beacons(id) ON DELETE CASCADE,
  user_wallet VARCHAR(44) NOT NULL, -- Solana public key
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for likes and replies
CREATE INDEX IF NOT EXISTS idx_beacon_likes_beacon_id ON beacon_likes(beacon_id);
CREATE INDEX IF NOT EXISTS idx_beacon_likes_user ON beacon_likes(user_wallet);
CREATE INDEX IF NOT EXISTS idx_beacon_replies_beacon_id ON beacon_replies(beacon_id);
CREATE INDEX IF NOT EXISTS idx_beacon_replies_user ON beacon_replies(user_wallet);

-- Enable RLS for likes and replies
ALTER TABLE beacon_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "beacon_likes_public_read" ON beacon_likes;
DROP POLICY IF EXISTS "beacon_likes_public_insert" ON beacon_likes;
DROP POLICY IF EXISTS "beacon_likes_public_delete" ON beacon_likes;
DROP POLICY IF EXISTS "beacon_replies_public_read" ON beacon_replies;
DROP POLICY IF EXISTS "beacon_replies_public_insert" ON beacon_replies;
DROP POLICY IF EXISTS "Allow public read access to beacon_likes" ON beacon_likes;
DROP POLICY IF EXISTS "Allow public insert access to beacon_likes" ON beacon_likes;
DROP POLICY IF EXISTS "Allow public delete access to beacon_likes" ON beacon_likes;
DROP POLICY IF EXISTS "Allow public read access to beacon_replies" ON beacon_replies;
DROP POLICY IF EXISTS "Allow public insert access to beacon_replies" ON beacon_replies;

-- Create policies for likes and replies
CREATE POLICY "beacon_likes_public_read" ON beacon_likes
  FOR SELECT USING (true);

CREATE POLICY "beacon_likes_public_insert" ON beacon_likes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "beacon_likes_public_delete" ON beacon_likes
  FOR DELETE USING (true);

CREATE POLICY "beacon_replies_public_read" ON beacon_replies
  FOR SELECT USING (true);

CREATE POLICY "beacon_replies_public_insert" ON beacon_replies
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON beacons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON beacons TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, DELETE ON beacon_likes TO anon;
GRANT SELECT, INSERT, DELETE ON beacon_likes TO authenticated;
GRANT SELECT, INSERT ON beacon_replies TO anon;
GRANT SELECT, INSERT ON beacon_replies TO authenticated;
