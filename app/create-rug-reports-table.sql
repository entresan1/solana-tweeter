-- Create rug_reports table for storing rug reports
-- This script safely creates the rug_reports table and policies

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can read rug_reports" ON rug_reports;
DROP POLICY IF EXISTS "Anyone can insert rug_reports" ON rug_reports;
DROP POLICY IF EXISTS "Reporter can update own rug_reports" ON rug_reports;
DROP POLICY IF EXISTS "Reporter can delete own rug_reports" ON rug_reports;

-- Create rug_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS rug_reports (
  id SERIAL PRIMARY KEY,
  beacon_id INTEGER NOT NULL, -- ID of the beacon being reported as rug
  reporter_wallet VARCHAR(44) NOT NULL, -- Wallet address of the reporter
  reporter_display VARCHAR(50) NOT NULL, -- Display name for reporter
  reason TEXT DEFAULT '', -- Optional reason for rug report
  timestamp BIGINT NOT NULL, -- Timestamp in milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_rug_reports_beacon_id ON rug_reports(beacon_id);
CREATE INDEX IF NOT EXISTS idx_rug_reports_reporter ON rug_reports(reporter_wallet);
CREATE INDEX IF NOT EXISTS idx_rug_reports_timestamp ON rug_reports(timestamp DESC);

-- Enable RLS
ALTER TABLE rug_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (fresh creation)
CREATE POLICY "Anyone can read rug_reports" ON rug_reports FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rug_reports" ON rug_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Reporter can update own rug_reports" ON rug_reports FOR UPDATE USING (reporter_wallet = current_setting('request.jwt.claims', true)::json->>'sub');
CREATE POLICY "Reporter can delete own rug_reports" ON rug_reports FOR DELETE USING (reporter_wallet = current_setting('request.jwt.claims', true)::json->>'sub');

-- Add comments for documentation
COMMENT ON TABLE rug_reports IS 'Stores rug reports for beacons (crypto scam warnings)';
COMMENT ON COLUMN rug_reports.beacon_id IS 'ID of the beacon being reported as a rug';
COMMENT ON COLUMN rug_reports.reporter_wallet IS 'Solana wallet address of the reporter';
COMMENT ON COLUMN rug_reports.reporter_display IS 'Display name for the reporter';
COMMENT ON COLUMN rug_reports.reason IS 'Optional reason for the rug report';
COMMENT ON COLUMN rug_reports.timestamp IS 'Timestamp when the rug was reported (milliseconds)';
