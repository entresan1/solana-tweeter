-- Add platform_wallet column to beacons table
-- This script adds the missing platform_wallet column to support platform wallet beacons

-- Add platform_wallet column if it doesn't exist
ALTER TABLE beacons ADD COLUMN IF NOT EXISTS platform_wallet BOOLEAN DEFAULT FALSE;

-- Add comment for the new column
COMMENT ON COLUMN beacons.platform_wallet IS 'Whether the beacon was sent from platform wallet (true) or Phantom wallet (false)';

-- Update existing records to have platform_wallet = false (they were sent via Phantom)
UPDATE beacons SET platform_wallet = FALSE WHERE platform_wallet IS NULL;

-- Create index for the new column for better performance
CREATE INDEX IF NOT EXISTS idx_beacons_platform_wallet ON beacons(platform_wallet);
