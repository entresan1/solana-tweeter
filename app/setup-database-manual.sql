-- Manual database setup for ca_purchases table
-- Run this in your Supabase SQL editor

-- Create ca_purchases table for tracking CA beacon purchases
CREATE TABLE IF NOT EXISTS ca_purchases (
  id SERIAL PRIMARY KEY,
  beacon_id INTEGER NOT NULL REFERENCES beacons(id) ON DELETE CASCADE,
  buyer_wallet VARCHAR(44) NOT NULL,
  contract_address VARCHAR(44) NOT NULL,
  purchase_amount DECIMAL(20, 9) NOT NULL,
  platform_fee DECIMAL(20, 9) NOT NULL,
  total_cost DECIMAL(20, 9) NOT NULL,
  transaction_data TEXT,
  transaction_signature VARCHAR(88),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ca_purchases_beacon_id ON ca_purchases(beacon_id);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_buyer_wallet ON ca_purchases(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_contract_address ON ca_purchases(contract_address);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_status ON ca_purchases(status);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_created_at ON ca_purchases(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE ca_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own purchases
CREATE POLICY IF NOT EXISTS "Users can view own ca_purchases" ON ca_purchases
  FOR SELECT USING (buyer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Policy: Users can insert their own purchases
CREATE POLICY IF NOT EXISTS "Users can insert own ca_purchases" ON ca_purchases
  FOR INSERT WITH CHECK (buyer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Policy: Public read access (for leaderboards, etc.)
CREATE POLICY IF NOT EXISTS "Public read access to ca_purchases" ON ca_purchases
  FOR SELECT USING (true);

-- Add comments
COMMENT ON TABLE ca_purchases IS 'Tracks purchases of CA (Contract Address) beacons';
COMMENT ON COLUMN ca_purchases.beacon_id IS 'Reference to the beacon being purchased';
COMMENT ON COLUMN ca_purchases.buyer_wallet IS 'Wallet address of the buyer';
COMMENT ON COLUMN ca_purchases.contract_address IS 'The contract address being purchased';
COMMENT ON COLUMN ca_purchases.purchase_amount IS 'Amount of SOL spent on the purchase';
COMMENT ON COLUMN ca_purchases.platform_fee IS 'Platform fee charged';
COMMENT ON COLUMN ca_purchases.total_cost IS 'Total cost including fees';
COMMENT ON COLUMN ca_purchases.transaction_data IS 'Serialized transaction data';
COMMENT ON COLUMN ca_purchases.transaction_signature IS 'Transaction signature on Solana';
COMMENT ON COLUMN ca_purchases.status IS 'Purchase status: pending, completed, failed';
