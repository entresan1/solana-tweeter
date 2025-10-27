const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voskmcxmtvophehityoa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ';

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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get likes for all beacons in one query
    const { data: likes, error } = await supabase
      .from('beacon_likes')
      .select('beacon_id, user_wallet')
      .in('beacon_id', beaconIdArray);

    if (error) {
      console.error('Error fetching likes batch:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Process likes data
    const likesMap = new Map();
    likes.forEach(like => {
      if (!likesMap.has(like.beacon_id)) {
        likesMap.set(like.beacon_id, []);
      }
      likesMap.get(like.beacon_id).push(like.user_wallet);
    });

    // Format response
    const result = beaconIdArray.map(beaconId => {
      const userLikes = likesMap.get(beaconId) || [];
      return {
        beacon_id: beaconId,
        count: userLikes.length,
        isLiked: false // Will be set by client based on current user
      };
    });

    return res.status(200).json({
      success: true,
      likes: result,
      count: result.length
    });

  } catch (error) {
    console.error('Batch likes API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};