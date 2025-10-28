const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  // Don't throw error on startup, handle it in the request handler
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
  // Check environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Missing required environment variables' 
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Leaderboard request received');
    
    // Get top users by beacons count - simplified query
    const { data: beaconLeaders, error: beaconError } = await supabase
      .from('beacons')
      .select('author, author_display')
      .limit(100); // Get more data to process client-side

    console.log('Beacon query result:', { data: beaconLeaders?.length, error: beaconError });

    let processedBeacons = [];
    if (!beaconError && beaconLeaders) {
      // Count beacons per author
      const authorCounts = {};
      beaconLeaders.forEach(beacon => {
        const author = beacon.author;
        const authorDisplay = beacon.author_display;
        if (!authorCounts[author]) {
          authorCounts[author] = { author, author_display: authorDisplay, beacon_count: 0 };
        }
        authorCounts[author].beacon_count++;
      });
      processedBeacons = Object.values(authorCounts)
        .sort((a, b) => b.beacon_count - a.beacon_count)
        .slice(0, 10);
    }

    // Get top users by likes received - simplified query
    const { data: likeLeaders, error: likeError } = await supabase
      .from('beacon_likes')
      .select('beacon_id');

    let processedLikes = [];
    if (!likeError && likeLeaders) {
      // Get beacon data for liked beacons
      const beaconIds = [...new Set(likeLeaders.map(like => like.beacon_id))];
      const { data: beacons } = await supabase
        .from('beacons')
        .select('id, author, author_display')
        .in('id', beaconIds);

      if (beacons) {
        // Count likes per author
        const authorLikes = {};
        likeLeaders.forEach(like => {
          const beacon = beacons.find(b => b.id === like.beacon_id);
          if (beacon) {
            const author = beacon.author;
            const authorDisplay = beacon.author_display;
            if (!authorLikes[author]) {
              authorLikes[author] = { author, author_display: authorDisplay, like_count: 0 };
            }
            authorLikes[author].like_count++;
          }
        });
        processedLikes = Object.values(authorLikes)
          .sort((a, b) => b.like_count - a.like_count)
          .slice(0, 10);
      }
    }

    // Get top users by tips received - simplified query
    const { data: tipLeaders, error: tipError } = await supabase
      .from('tips')
      .select('recipient, amount');

    let processedTips = [];
    if (!tipError && tipLeaders) {
      // Calculate total tips per recipient
      const recipientTips = {};
      tipLeaders.forEach(tip => {
        const recipient = tip.recipient;
        if (!recipientTips[recipient]) {
          recipientTips[recipient] = { 
            author: recipient, 
            author_display: recipient.slice(0, 8) + '...',
            tip_count: 0,
            total_tips: 0
          };
        }
        recipientTips[recipient].tip_count++;
        recipientTips[recipient].total_tips += parseFloat(tip.amount || 0);
      });
      processedTips = Object.values(recipientTips)
        .sort((a, b) => b.total_tips - a.total_tips)
        .slice(0, 10);
    }

    const leaderboard = {
      beacons: processedBeacons,
      likes: processedLikes,
      tips: processedTips
    };

    res.status(200).json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data',
      details: error.message
    });
  }
};
