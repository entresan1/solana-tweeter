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

    // Get rug counts for all beacons in one query
    const { data: rugs, error } = await supabase
      .from('rug_reports')
      .select('beacon_id, count(*) as count')
      .in('beacon_id', beaconIdArray)
      .group('beacon_id');

    if (error) {
      console.error('Error fetching rugs batch:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Format response
    const rugsMap = {};
    rugs.forEach(rug => {
      rugsMap[rug.beacon_id] = {
        beacon_id: rug.beacon_id,
        count: parseInt(rug.count),
        is_rugged: false // We'll implement user-specific rugs later
      };
    });

    // Ensure all requested beacons have entries (even with 0 rugs)
    const result = beaconIdArray.map(beaconId => 
      rugsMap[beaconId] || { beacon_id: beaconId, count: 0, is_rugged: false }
    );

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
