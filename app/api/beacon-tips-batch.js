const { createClient } = require('@supabase/supabase-js');
const config = require('./secure-config');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://trenchbeacon.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { beaconIds } = req.query;
    
    if (!beaconIds) {
      return res.status(400).json({ error: 'beaconIds parameter is required' });
    }

    const beaconIdArray = beaconIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (beaconIdArray.length === 0) {
      return res.status(400).json({ error: 'No valid beacon IDs provided' });
    }

    const supabase = createClient(config.supabase.url, config.supabase.key);

    // Get tip messages for all beacons in one query
    const { data: tips, error } = await supabase
      .from('tips')
      .select(`
        id,
        amount,
        message,
        tipper,
        tipper_display,
        timestamp,
        beacon_id
      `)
      .in('beacon_id', beaconIdArray)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching tips batch:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Group tips by beacon_id
    const tipsByBeacon = {};
    tips.forEach(tip => {
      if (!tipsByBeacon[tip.beacon_id]) {
        tipsByBeacon[tip.beacon_id] = [];
      }
      tipsByBeacon[tip.beacon_id].push(tip);
    });

    return res.status(200).json({
      success: true,
      tips: tips,
      tipsByBeacon: tipsByBeacon,
      count: tips.length
    });

  } catch (error) {
    console.error('Batch tips API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
