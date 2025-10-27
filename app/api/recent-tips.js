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
    const { limit = 20 } = req.query;

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

    // Get recent tips with beacon information
    const { data: tips, error } = await supabase
      .from('tips')
      .select(`
        id,
        recipient,
        amount,
        message,
        beacon_id,
        tipper,
        tipper_display,
        timestamp,
        treasury_transaction,
        platform_wallet,
        beacons!inner(
          id,
          content,
          topic,
          author_display
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('❌ Error fetching recent tips:', error);
      return res.status(500).json({ error: 'Database Error', message: error.message });
    }

    // Format the response
    const formattedTips = tips?.map(tip => ({
      id: tip.id,
      recipient: tip.recipient,
      amount: parseFloat(tip.amount),
      message: tip.message,
      beaconId: tip.beacon_id,
      tipper: tip.tipper,
      tipperDisplay: tip.tipper_display,
      timestamp: tip.timestamp,
      transaction: tip.treasury_transaction,
      platformWallet: tip.platform_wallet,
      beacon: {
        id: tip.beacons.id,
        content: tip.beacons.content,
        topic: tip.beacons.topic,
        authorDisplay: tip.beacons.author_display
      }
    })) || [];

    return res.status(200).json({ 
      success: true, 
      tips: formattedTips,
      count: formattedTips.length
    });
  } catch (error) {
    console.error('❌ Recent tips API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch recent tips',
    });
  }
};
