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
    // Get top users by beacons count
    const { data: beaconLeaders, error: beaconError } = await supabase
      .from('beacons')
      .select('author, author_display, count(*) as beacon_count')
      .group('author, author_display')
      .order('beacon_count', { ascending: false })
      .limit(10);

    if (beaconError) {
      console.error('Beacon leaderboard error:', beaconError);
    }

    // Get top users by likes received
    const { data: likeLeaders, error: likeError } = await supabase
      .from('beacon_likes')
      .select(`
        beacon_id,
        beacons!inner(author, author_display)
      `)
      .then(async (result) => {
        if (result.error) throw result.error;
        
        // Count likes per author
        const authorLikes = {};
        result.data.forEach(like => {
          const author = like.beacons.author;
          const authorDisplay = like.beacons.author_display;
          if (!authorLikes[author]) {
            authorLikes[author] = { author, author_display: authorDisplay, like_count: 0 };
          }
          authorLikes[author].like_count++;
        });
        
        return Object.values(authorLikes).sort((a, b) => b.like_count - a.like_count).slice(0, 10);
      });

    if (likeError) {
      console.error('Like leaderboard error:', likeError);
    }

    // Get top users by tips received
    const { data: tipLeaders, error: tipError } = await supabase
      .from('tips')
      .select('recipient, amount')
      .then(async (result) => {
        if (result.error) throw result.error;
        
        // Get recipient profiles
        const recipients = [...new Set(result.data.map(tip => tip.recipient))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('wallet_address, nickname')
          .in('wallet_address', recipients);
        
        // Calculate total tips per recipient
        const recipientTips = {};
        result.data.forEach(tip => {
          if (!recipientTips[tip.recipient]) {
            recipientTips[tip.recipient] = { 
              author: tip.recipient, 
              author_display: profiles?.find(p => p.wallet_address === tip.recipient)?.nickname || tip.recipient.slice(0, 8) + '...',
              tip_count: 0,
              total_tips: 0
            };
          }
          recipientTips[tip.recipient].tip_count++;
          recipientTips[tip.recipient].total_tips += parseFloat(tip.amount || 0);
        });
        
        return Object.values(recipientTips).sort((a, b) => b.total_tips - a.total_tips).slice(0, 10);
      });

    if (tipError) {
      console.error('Tip leaderboard error:', tipError);
    }

    const leaderboard = {
      beacons: beaconLeaders || [],
      likes: likeLeaders || [],
      tips: tipLeaders || []
    };

    res.status(200).json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard data'
    });
  }
};
