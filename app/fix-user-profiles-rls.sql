-- Fix RLS policies for user_profiles table to allow public read access

-- First, disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow public insert on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow public update on user_profiles" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_read" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_public_update" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies that allow public access
CREATE POLICY "user_profiles_public_read" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "user_profiles_public_insert" ON user_profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_profiles_public_update" ON user_profiles
  FOR UPDATE USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
