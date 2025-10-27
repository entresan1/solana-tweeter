-- Create beacons table for x402 payment-gated beacons
CREATE TABLE IF NOT EXISTS beacons (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT DEFAULT 'general',
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  author_display TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  treasury_transaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_beacons_timestamp ON beacons(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_beacons_author ON beacons(author);
CREATE INDEX IF NOT EXISTS idx_beacons_topic ON beacons(topic);

-- Enable Row Level Security
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read beacons
CREATE POLICY "Anyone can read beacons" ON beacons
  FOR SELECT USING (true);

-- Create policy to allow anyone to insert beacons (for x402 payments)
CREATE POLICY "Anyone can insert beacons" ON beacons
  FOR INSERT WITH CHECK (true);

-- Create policy to allow authors to update their own beacons
CREATE POLICY "Authors can update their own beacons" ON beacons
  FOR UPDATE USING (auth.jwt() ->> 'sub' = author);

-- Create policy to allow authors to delete their own beacons
CREATE POLICY "Authors can delete their own beacons" ON beacons
  FOR DELETE USING (auth.jwt() ->> 'sub' = author);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_beacons_updated_at 
  BEFORE UPDATE ON beacons 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
