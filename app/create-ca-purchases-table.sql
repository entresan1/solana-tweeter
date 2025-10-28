-- Create CA purchases table to track token purchases
CREATE TABLE IF NOT EXISTS ca_purchases (
  id SERIAL PRIMARY KEY,
  beacon_id INTEGER NOT NULL REFERENCES beacons(id) ON DELETE CASCADE,
  buyer_wallet VARCHAR(44) NOT NULL,
  contract_address VARCHAR(44) NOT NULL,
  purchase_amount DECIMAL(18, 9) NOT NULL DEFAULT 0.001,
  platform_fee DECIMAL(18, 9) NOT NULL DEFAULT 0.00005,
  transaction_signature VARCHAR(88),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ca_purchases_beacon_id ON ca_purchases(beacon_id);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_buyer_wallet ON ca_purchases(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_contract_address ON ca_purchases(contract_address);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_created_at ON ca_purchases(created_at);

-- Add columns to beacons table for CA tracking
ALTER TABLE beacons ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE beacons ADD COLUMN IF NOT EXISTS last_purchased_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_beacons_purchase_count ON beacons(purchase_count);
CREATE INDEX IF NOT EXISTS idx_beacons_last_purchased_at ON beacons(last_purchased_at);

-- Add RLS policies for CA purchases
ALTER TABLE ca_purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all CA purchases
CREATE POLICY "Users can view all CA purchases" ON ca_purchases
  FOR SELECT USING (true);

-- Policy: Users can insert their own CA purchases
CREATE POLICY "Users can insert their own CA purchases" ON ca_purchases
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own CA purchases
CREATE POLICY "Users can update their own CA purchases" ON ca_purchases
  FOR UPDATE USING (true);

-- Policy: Users can delete their own CA purchases
CREATE POLICY "Users can delete their own CA purchases" ON ca_purchases
  FOR DELETE USING (true);
