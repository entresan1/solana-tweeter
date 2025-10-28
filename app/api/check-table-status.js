const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Missing required environment variables' 
    });
  }

  try {
    // Check if ca_purchases table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'ca_purchases');

    if (tableError) {
      console.error('Error checking tables:', tableError);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to check table existence',
        details: tableError.message
      });
    }

    const tableExists = tables && tables.length > 0;

    if (!tableExists) {
      return res.status(404).json({
        error: 'Table not found',
        message: 'ca_purchases table does not exist',
        instructions: {
          step1: 'Go to your Supabase dashboard',
          step2: 'Navigate to SQL Editor',
          step3: 'Run the SQL from setup-ca-purchases-simple.sql',
          step4: 'Or copy and paste the SQL below',
          sql: `
-- Create ca_purchases table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ca_purchases_beacon_id ON ca_purchases(beacon_id);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_buyer_wallet ON ca_purchases(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_contract_address ON ca_purchases(contract_address);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_status ON ca_purchases(status);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_created_at ON ca_purchases(created_at);

-- Enable RLS
ALTER TABLE ca_purchases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (ignore errors)
DROP POLICY IF EXISTS "Users can view own ca_purchases" ON ca_purchases;
DROP POLICY IF EXISTS "Users can insert own ca_purchases" ON ca_purchases;
DROP POLICY IF EXISTS "Public read access to ca_purchases" ON ca_purchases;

-- Create policies
CREATE POLICY "Users can view own ca_purchases" ON ca_purchases
  FOR SELECT USING (buyer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can insert own ca_purchases" ON ca_purchases
  FOR INSERT WITH CHECK (buyer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Public read access to ca_purchases" ON ca_purchases
  FOR SELECT USING (true);
          `
        }
      });
    }

    // Check table structure
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'ca_purchases')
      .order('ordinal_position');

    if (columnError) {
      console.error('Error checking columns:', columnError);
      return res.status(500).json({ 
        error: 'Database error', 
        message: 'Failed to check table structure',
        details: columnError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'ca_purchases table exists and is ready',
      table: {
        exists: true,
        columns: columns
      },
      treasuryFees: {
        tips: '5% of tip amount goes to treasury',
        caPurchases: '1% of purchase amount goes to treasury'
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
