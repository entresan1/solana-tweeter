-- Complete fix for all tables to support platform wallet functionality
-- This script ensures both beacons and tips tables have the platform_wallet column

-- ========================================
-- FIX BEACONS TABLE
-- ========================================

-- Add platform_wallet column to beacons table if it doesn't exist
ALTER TABLE beacons ADD COLUMN IF NOT EXISTS platform_wallet BOOLEAN DEFAULT FALSE;

-- Add comment for the new column
COMMENT ON COLUMN beacons.platform_wallet IS 'Whether the beacon was sent from platform wallet (true) or Phantom wallet (false)';

-- Update existing records to have platform_wallet = false (they were sent via Phantom)
UPDATE beacons SET platform_wallet = FALSE WHERE platform_wallet IS NULL;

-- Create index for the new column for better performance
CREATE INDEX IF NOT EXISTS idx_beacons_platform_wallet ON beacons(platform_wallet);

-- ========================================
-- FIX TIPS TABLE
-- ========================================

-- Add platform_wallet column to tips table if it doesn't exist
ALTER TABLE tips ADD COLUMN IF NOT EXISTS platform_wallet BOOLEAN DEFAULT FALSE;

-- Add comment for the new column
COMMENT ON COLUMN tips.platform_wallet IS 'Whether the tip was sent from platform wallet (true) or Phantom wallet (false)';

-- Update existing records to have platform_wallet = false (they were sent via Phantom)
UPDATE tips SET platform_wallet = FALSE WHERE platform_wallet IS NULL;

-- Create index for the new column for better performance
CREATE INDEX IF NOT EXISTS idx_tips_platform_wallet ON tips(platform_wallet);

-- ========================================
-- VERIFY CHANGES
-- ========================================

-- Show the structure of both tables to verify the changes
SELECT 
  'beacons' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'beacons' 
  AND column_name = 'platform_wallet'

UNION ALL

SELECT 
  'tips' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tips' 
  AND column_name = 'platform_wallet';
