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

    // Check if tips table exists by trying to query it
    const { data: tipsData, error: tipsError } = await supabase
      .from('tips')
      .select('id')
      .limit(1);

    // Check if platform_deposits table exists
    const { data: depositsData, error: depositsError } = await supabase
      .from('platform_deposits')
      .select('id')
      .limit(1);

    // Check if beacons table exists
    const { data: beaconsData, error: beaconsError } = await supabase
      .from('beacons')
      .select('id')
      .limit(1);

    return res.status(200).json({
      success: true,
      tables: {
        tips: {
          exists: !tipsError,
          error: tipsError?.message || null
        },
        platform_deposits: {
          exists: !depositsError,
          error: depositsError?.message || null
        },
        beacons: {
          exists: !beaconsError,
          error: beaconsError?.message || null
        }
      },
      environment: {
        supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
        supabaseKey: supabaseKey ? 'SET' : 'NOT SET'
      }
    });

  } catch (error) {
    console.error('❌ Check tables API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check tables',
    });
  }
};
