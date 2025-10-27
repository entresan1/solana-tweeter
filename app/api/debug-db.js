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

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    console.log('🔍 Environment variables check:');
    console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        message: 'Supabase credentials not found'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('❌ Connection test failed:', connectionError);
      return res.status(500).json({
        error: 'Connection failed',
        message: connectionError.message,
        code: connectionError.code
      });
    }

    // Check if beacons table exists
    const { data: beaconsTest, error: beaconsError } = await supabase
      .from('beacons')
      .select('count')
      .limit(1);

    return res.status(200).json({
      success: true,
      connection: 'OK',
      beaconsTable: beaconsError ? 'MISSING' : 'EXISTS',
      beaconsError: beaconsError ? {
        message: beaconsError.message,
        code: beaconsError.code,
        details: beaconsError.details
      } : null,
      environment: {
        supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
        supabaseKey: supabaseKey ? 'SET' : 'NOT SET'
      }
    });

  } catch (error) {
    console.error('❌ Debug API error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      message: error.message
    });
  }
};
