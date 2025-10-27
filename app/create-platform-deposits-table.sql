-- Create platform_deposits table for storing platform wallet deposits
CREATE TABLE IF NOT EXISTS platform_deposits (
  id SERIAL PRIMARY KEY,
  user_wallet VARCHAR(44) NOT NULL, -- User's wallet address
  platform_wallet VARCHAR(44) NOT NULL, -- Platform wallet address
  amount DECIMAL(10, 6) NOT NULL, -- Deposit amount in SOL
  transaction VARCHAR(88) NOT NULL, -- Solana transaction signature
  timestamp BIGINT NOT NULL, -- Timestamp in milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_deposits_user_wallet ON platform_deposits(user_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_deposits_platform_wallet ON platform_deposits(platform_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_deposits_timestamp ON platform_deposits(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE platform_deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Anyone can read deposits (public data)
CREATE POLICY "Anyone can read platform deposits" ON platform_deposits
  FOR SELECT
  USING (true);

-- Anyone can insert deposits (anyone can deposit)
CREATE POLICY "Anyone can insert platform deposits" ON platform_deposits
  FOR INSERT
  WITH CHECK (true);

-- Only the user can update their own deposits
CREATE POLICY "User can update own deposits" ON platform_deposits
  FOR UPDATE
  USING (user_wallet = current_setting('request.jwt.claims', true)::json->>'sub');

-- Only the user can delete their own deposits
CREATE POLICY "User can delete own deposits" ON platform_deposits
  FOR DELETE
  USING (user_wallet = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add comments for documentation
COMMENT ON TABLE platform_deposits IS 'Stores platform wallet deposits from users';
COMMENT ON COLUMN platform_deposits.user_wallet IS 'User wallet address who made the deposit';
COMMENT ON COLUMN platform_deposits.platform_wallet IS 'Platform wallet address that received the deposit';
COMMENT ON COLUMN platform_deposits.amount IS 'Deposit amount in SOL (decimal with 6 decimal places)';
COMMENT ON COLUMN platform_deposits.transaction IS 'Solana transaction signature for the deposit';
COMMENT ON COLUMN platform_deposits.timestamp IS 'Timestamp when the deposit was made (milliseconds)';
