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

    // Get replies for all beacons in one query
    const { data: replies, error } = await supabase
      .from('beacon_replies')
      .select('beacon_id, user_wallet, content, created_at')
      .in('beacon_id', beaconIdArray)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies batch:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Process replies data
    const repliesMap = new Map();
    replies.forEach(reply => {
      if (!repliesMap.has(reply.beacon_id)) {
        repliesMap.set(reply.beacon_id, []);
      }
      repliesMap.get(reply.beacon_id).push({
        user_wallet: reply.user_wallet,
        content: reply.content,
        created_at: reply.created_at
      });
    });

    // Format response
    const result = beaconIdArray.map(beaconId => {
      const beaconReplies = repliesMap.get(beaconId) || [];
      
      return {
        beacon_id: beaconId,
        count: beaconReplies.length,
        messages: beaconReplies
      };
    });

    return res.status(200).json({
      success: true,
      replies: result,
      count: result.length
    });

  } catch (error) {
    console.error('Batch replies API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
