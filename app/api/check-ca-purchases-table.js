const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Check environment variables
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Missing required environment variables' 
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Checking if ca_purchases table exists...');

    // Try to query the table
    const { data, error } = await supabase
      .from('ca_purchases')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        // Table doesn't exist
        return res.status(404).json({ 
          success: false,
          tableExists: false,
          message: 'ca_purchases table does not exist',
          instructions: {
            step1: 'Go to your Supabase dashboard',
            step2: 'Navigate to SQL Editor',
            step3: 'Run the SQL from setup-database-manual.sql file',
            step4: 'Or run this SQL:',
            sql: `
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

CREATE INDEX IF NOT EXISTS idx_ca_purchases_beacon_id ON ca_purchases(beacon_id);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_buyer_wallet ON ca_purchases(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_contract_address ON ca_purchases(contract_address);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_status ON ca_purchases(status);
CREATE INDEX IF NOT EXISTS idx_ca_purchases_created_at ON ca_purchases(created_at);

ALTER TABLE ca_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own ca_purchases" ON ca_purchases
  FOR SELECT USING (buyer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY IF NOT EXISTS "Users can insert own ca_purchases" ON ca_purchases
  FOR INSERT WITH CHECK (buyer_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY IF NOT EXISTS "Public read access to ca_purchases" ON ca_purchases
  FOR SELECT USING (true);
            `
          }
        });
      } else {
        // Other database error
        return res.status(500).json({ 
          success: false,
          tableExists: false,
          error: 'Database error',
          message: error.message
        });
      }
    }

    // Table exists
    return res.status(200).json({ 
      success: true,
      tableExists: true,
      message: 'ca_purchases table exists and is accessible',
      recordCount: data ? data.length : 0
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
