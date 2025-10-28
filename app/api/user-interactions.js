const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    const { walletAddress, type } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required'
      });
    }

    console.log(`🔍 Fetching ${type || 'all'} interactions for wallet:`, walletAddress);

    let interactions = [];

    if (!type || type === 'likes') {
      // Fetch liked beacons
      const { data: likes, error: likesError } = await supabase
        .from('beacon_interactions')
        .select(`
          *,
          beacon:beacon_id (
            id,
            content,
            topic,
            author,
            author_display,
            created_at,
            treasury_transaction
          )
        `)
        .eq('user_wallet', walletAddress)
        .eq('action', 'like')
        .order('created_at', { ascending: false });

      if (likesError) {
        console.error('Error fetching likes:', likesError);
      } else {
        interactions = [...interactions, ...(likes || [])];
      }
    }

    if (!type || type === 'replies') {
      // Fetch replied beacons
      const { data: replies, error: repliesError } = await supabase
        .from('beacon_replies')
        .select(`
          *,
          beacon:beacon_id (
            id,
            content,
            topic,
            author,
            author_display,
            created_at,
            treasury_transaction
          )
        `)
        .eq('user_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (repliesError) {
        console.error('Error fetching replies:', repliesError);
      } else {
        interactions = [...interactions, ...(replies || [])];
      }
    }

    if (!type || type === 'tips') {
      // Fetch tipped beacons
      const { data: tips, error: tipsError } = await supabase
        .from('beacon_tips')
        .select(`
          *,
          beacon:beacon_id (
            id,
            content,
            topic,
            author,
            author_display,
            created_at,
            treasury_transaction
          )
        `)
        .eq('user_wallet', walletAddress)
        .order('created_at', { ascending: false });

      if (tipsError) {
        console.error('Error fetching tips:', tipsError);
      } else {
        interactions = [...interactions, ...(tips || [])];
      }
    }

    console.log(`✅ Found ${interactions.length} interactions`);

    return res.status(200).json({
      success: true,
      interactions: interactions,
      count: interactions.length
    });

  } catch (error) {
    console.error('❌ User interactions fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user interactions'
    });
  }
};
