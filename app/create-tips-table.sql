-- Create tips table for storing tip transactions
CREATE TABLE IF NOT EXISTS tips (
  id SERIAL PRIMARY KEY,
  recipient VARCHAR(44) NOT NULL, -- Solana wallet address
  amount DECIMAL(10, 6) NOT NULL, -- Tip amount in SOL
  message TEXT DEFAULT '', -- Optional tip message
  beacon_id INTEGER NOT NULL, -- ID of the beacon being tipped
  tipper VARCHAR(44) NOT NULL, -- Wallet address of the tipper
  tipper_display VARCHAR(50) NOT NULL, -- Display name for tipper
  timestamp BIGINT NOT NULL, -- Timestamp in milliseconds
  treasury_transaction VARCHAR(88) NOT NULL, -- Solana transaction signature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tips_recipient ON tips(recipient);
CREATE INDEX IF NOT EXISTS idx_tips_beacon_id ON tips(beacon_id);
CREATE INDEX IF NOT EXISTS idx_tips_tipper ON tips(tipper);
CREATE INDEX IF NOT EXISTS idx_tips_timestamp ON tips(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Anyone can read tips (public data)
CREATE POLICY "Anyone can read tips" ON tips
  FOR SELECT
  USING (true);

-- Anyone can insert tips (anyone can tip)
CREATE POLICY "Anyone can insert tips" ON tips
  FOR INSERT
  WITH CHECK (true);

-- Only the tipper can update their own tips
CREATE POLICY "Tipper can update own tips" ON tips
  FOR UPDATE
  USING (tipper = current_setting('request.jwt.claims', true)::json->>'sub');

-- Only the tipper can delete their own tips
CREATE POLICY "Tipper can delete own tips" ON tips
  FOR DELETE
  USING (tipper = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add foreign key constraint to beacons table (optional)
-- ALTER TABLE tips ADD CONSTRAINT fk_tips_beacon_id 
--   FOREIGN KEY (beacon_id) REFERENCES beacons(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE tips IS 'Stores tip transactions between users';
COMMENT ON COLUMN tips.recipient IS 'Solana wallet address of the tip recipient';
COMMENT ON COLUMN tips.amount IS 'Tip amount in SOL (decimal with 6 decimal places)';
COMMENT ON COLUMN tips.message IS 'Optional message from the tipper';
COMMENT ON COLUMN tips.beacon_id IS 'ID of the beacon that was tipped';
COMMENT ON COLUMN tips.tipper IS 'Solana wallet address of the tipper';
COMMENT ON COLUMN tips.tipper_display IS 'Display name for the tipper';
COMMENT ON COLUMN tips.timestamp IS 'Timestamp when the tip was sent (milliseconds)';
COMMENT ON COLUMN tips.treasury_transaction IS 'Solana transaction signature for the tip payment';
