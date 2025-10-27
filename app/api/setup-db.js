const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Database configuration missing',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check which tables exist
    const tableChecks = {};
    
    // Check tips table
    try {
      const { data: tipsData, error: tipsError } = await supabase
        .from('tips')
        .select('id')
        .limit(1);
      tableChecks.tips = { exists: !tipsError, error: tipsError?.message };
    } catch (e) {
      tableChecks.tips = { exists: false, error: e.message };
    }

    // Check platform_deposits table
    try {
      const { data: depositsData, error: depositsError } = await supabase
        .from('platform_deposits')
        .select('id')
        .limit(1);
      tableChecks.platform_deposits = { exists: !depositsError, error: depositsError?.message };
    } catch (e) {
      tableChecks.platform_deposits = { exists: false, error: e.message };
    }

    // Check beacons table
    try {
      const { data: beaconsData, error: beaconsError } = await supabase
        .from('beacons')
        .select('id')
        .limit(1);
      tableChecks.beacons = { exists: !beaconsError, error: beaconsError?.message };
    } catch (e) {
      tableChecks.beacons = { exists: false, error: e.message };
    }

    // Provide SQL commands to create missing tables
    const sqlCommands = {
      tips: `-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id SERIAL PRIMARY KEY,
  sender_wallet VARCHAR(44) NOT NULL,
  recipient_wallet VARCHAR(44) NOT NULL,
  amount DECIMAL(10, 6) NOT NULL,
  message TEXT DEFAULT NULL,
  beacon_id INTEGER DEFAULT NULL,
  transaction_signature VARCHAR(88) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tips_recipient_wallet ON tips(recipient_wallet);
CREATE INDEX IF NOT EXISTS idx_tips_beacon_id ON tips(beacon_id);
CREATE INDEX IF NOT EXISTS idx_tips_sender_wallet ON tips(sender_wallet);
CREATE INDEX IF NOT EXISTS idx_tips_timestamp ON tips(timestamp DESC);

-- Enable RLS
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read tips" ON tips FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tips" ON tips FOR INSERT WITH CHECK (true);`,

      platform_deposits: `-- Create platform_deposits table
CREATE TABLE IF NOT EXISTS platform_deposits (
  id SERIAL PRIMARY KEY,
  user_wallet VARCHAR(44) NOT NULL,
  platform_wallet VARCHAR(44) NOT NULL,
  amount DECIMAL(10, 6) NOT NULL,
  transaction VARCHAR(88) NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_platform_deposits_user_wallet ON platform_deposits(user_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_deposits_platform_wallet ON platform_deposits(platform_wallet);
CREATE INDEX IF NOT EXISTS idx_platform_deposits_timestamp ON platform_deposits(timestamp DESC);

-- Enable RLS
ALTER TABLE platform_deposits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read platform_deposits" ON platform_deposits FOR SELECT USING (true);
CREATE POLICY "Anyone can insert platform_deposits" ON platform_deposits FOR INSERT WITH CHECK (true);`
    };

    return res.status(200).json({
      success: true,
      message: 'Database setup check completed',
      tables: tableChecks,
      missingTables: Object.keys(tableChecks).filter(table => !tableChecks[table].exists),
      sqlCommands: sqlCommands,
      instructions: {
        steps: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to the SQL Editor',
          '3. Run the SQL commands for missing tables',
          '4. Test the APIs again'
        ],
        note: 'The SQL commands are provided above for each missing table'
      }
    });

  } catch (error) {
    console.error('❌ Setup DB API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check database setup',
    });
  }
};
