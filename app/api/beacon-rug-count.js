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
    const { beaconId } = req.query;

    if (!beaconId) {
      return res.status(400).json({ error: 'Bad Request', message: 'beaconId is required' });
    }

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

    const { data, error } = await supabase
      .from('rug_reports')
      .select('id')
      .eq('beacon_id', beaconId);

    if (error) {
      console.error('❌ Error fetching rug reports for beacon:', error);
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    const rugCount = data?.length || 0;

    return res.status(200).json({ 
      success: true, 
      count: rugCount,
      beaconId: parseInt(beaconId)
    });
  } catch (error) {
    console.error('❌ API handler error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
