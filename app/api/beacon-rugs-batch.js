const { createClient } = require('@supabase/supabase-js');
const config = require('./secure-config');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
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

    // Get rugs for all beacons in one query
    const { data: rugs, error } = await supabase
      .from('rug_reports')
      .select('beacon_id, user_wallet')
      .in('beacon_id', beaconIdArray);

    if (error) {
      console.error('Error fetching rugs batch:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Process rugs data
    const rugsMap = new Map();
    rugs.forEach(rug => {
      if (!rugsMap.has(rug.beacon_id)) {
        rugsMap.set(rug.beacon_id, []);
      }
      rugsMap.get(rug.beacon_id).push(rug.user_wallet);
    });

    // Format response
    const result = beaconIdArray.map(beaconId => {
      const userRugs = rugsMap.get(beaconId) || [];
      return {
        beacon_id: beaconId,
        count: userRugs.length,
        isRugged: false // Will be set by client based on current user
      };
    });

    return res.status(200).json({
      success: true,
      rugs: result,
      count: result.length
    });

  } catch (error) {
    console.error('Batch rugs API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};