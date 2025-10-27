-- Add platform_wallet column to tips table
-- This script adds the missing platform_wallet column

-- Add platform_wallet column if it doesn't exist
ALTER TABLE tips ADD COLUMN IF NOT EXISTS platform_wallet BOOLEAN DEFAULT FALSE;

-- Add comment for the new column
COMMENT ON COLUMN tips.platform_wallet IS 'Whether the tip was sent from platform wallet (true) or Phantom wallet (false)';

-- Update existing records to have platform_wallet = false (they were sent via Phantom)
UPDATE tips SET platform_wallet = FALSE WHERE platform_wallet IS NULL;
