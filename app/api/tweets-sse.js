const { createClient } = require('@supabase/supabase-js');
const { 
  secureAuthMiddleware, 
  logAuditEvent 
} = require('./secure-auth-middleware');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voskmcxmtvophehityoa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Store active SSE connections
const connections = new Set();
let lastUpdateTime = 0;
let lastTweetsData = null;

// Broadcast function
function broadcast(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach(connection => {
    try {
      connection.write(message);
    } catch (error) {
      console.error('Error sending SSE message:', error);
      connections.delete(connection);
    }
  });
}

// Get unified tweets data (reuse logic from tweets-unified.js)
async function getUnifiedTweets(page = 1, limit = 20, userWallet = null) {
  const offset = (page - 1) * limit;
  
  try {
    // Get beacons with pagination
    const { data: beacons, error: beaconsError } = await supabase
      .from('beacons')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (beaconsError) {
      throw beaconsError;
    }

    if (!beacons || beacons.length === 0) {
      return {
        tweets: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    }

    // Get all beacon IDs for batch queries
    const beaconIds = beacons.map(b => b.id);

    // Batch fetch all sub-data
    const [
      likesData,
      rugsData,
      tipsData,
      repliesData,
      profilesData
    ] = await Promise.all([
      // Get likes for all beacons
      supabase
        .from('beacon_likes')
        .select('beacon_id, user_wallet')
        .in('beacon_id', beaconIds),
      
      // Get rugs for all beacons
      supabase
        .from('rug_reports')
        .select('beacon_id, user_wallet')
        .in('beacon_id', beaconIds),
      
      // Get tips for all beacons
      supabase
        .from('tips')
        .select('beacon_id, amount, user_wallet, message')
        .in('beacon_id', beaconIds),
      
      // Get replies for all beacons
      supabase
        .from('beacon_replies')
        .select('beacon_id, user_wallet, content, created_at')
        .in('beacon_id', beaconIds)
        .order('created_at', { ascending: true }),
      
      // Get user profiles for all authors
      supabase
        .from('user_profiles')
        .select('wallet_address, nickname, profile_picture_url')
        .in('wallet_address', beacons.map(b => b.author))
    ]);

    // Process likes data
    const likesMap = new Map();
    if (likesData.data) {
      likesData.data.forEach(like => {
        if (!likesMap.has(like.beacon_id)) {
          likesMap.set(like.beacon_id, { count: 0, userLiked: false });
        }
        likesMap.get(like.beacon_id).count++;
        if (userWallet && like.user_wallet === userWallet) {
          likesMap.get(like.beacon_id).userLiked = true;
        }
      });
    }

    // Process rugs data
    const rugsMap = new Map();
    if (rugsData.data) {
      rugsData.data.forEach(rug => {
        if (!rugsMap.has(rug.beacon_id)) {
          rugsMap.set(rug.beacon_id, { count: 0, userRugged: false });
        }
        rugsMap.get(rug.beacon_id).count++;
        if (userWallet && rug.user_wallet === userWallet) {
          rugsMap.get(rug.beacon_id).userRugged = true;
        }
      });
    }

    // Process tips data
    const tipsMap = new Map();
    if (tipsData.data) {
      tipsData.data.forEach(tip => {
        if (!tipsMap.has(tip.beacon_id)) {
          tipsMap.set(tip.beacon_id, { totalAmount: 0, count: 0, messages: [] });
        }
        const tipData = tipsMap.get(tip.beacon_id);
        tipData.totalAmount += parseFloat(tip.amount || 0);
        tipData.count++;
        if (tip.message) {
          tipData.messages.push({
            user: tip.user_wallet,
            message: tip.message,
            amount: tip.amount
          });
        }
      });
    }

    // Process replies data
    const repliesMap = new Map();
    if (repliesData.data) {
      repliesData.data.forEach(reply => {
        if (!repliesMap.has(reply.beacon_id)) {
          repliesMap.set(reply.beacon_id, []);
        }
        repliesMap.get(reply.beacon_id).push({
          id: reply.id,
          user: reply.user_wallet,
          content: reply.content,
          created_at: reply.created_at
        });
      });
    }

    // Process profiles data
    const profilesMap = new Map();
    if (profilesData.data) {
      profilesData.data.forEach(profile => {
        profilesMap.set(profile.wallet_address, {
          nickname: profile.nickname,
          profile_picture_url: profile.profile_picture_url
        });
      });
    }

    // Build unified tweet objects
    const tweets = beacons.map(beacon => {
      const likes = likesMap.get(beacon.id) || { count: 0, userLiked: false };
      const rugs = rugsMap.get(beacon.id) || { count: 0, userRugged: false };
      const tips = tipsMap.get(beacon.id) || { totalAmount: 0, count: 0, messages: [] };
      const replies = repliesMap.get(beacon.id) || [];
      const profile = profilesMap.get(beacon.author) || {};

      return {
        id: beacon.id,
        content: beacon.content,
        topic: beacon.topic,
        author: beacon.author,
        authorDisplay: profile.nickname || `${beacon.author.slice(0, 4)}...${beacon.author.slice(-4)}`,
        profilePicture: profile.profile_picture_url,
        timestamp: beacon.timestamp,
        treasuryTransaction: beacon.treasury_transaction,
        platformWallet: beacon.platform_wallet,
        created_at: beacon.created_at,
        
        // Sub-data
        likes: {
          count: likes.count,
          userLiked: likes.userLiked
        },
        rugs: {
          count: rugs.count,
          userRugged: rugs.userRugged
        },
        tips: {
          totalAmount: tips.totalAmount,
          count: tips.count,
          messages: tips.messages
        },
        replies: {
          count: replies.length,
          data: replies
        }
      };
    });

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('beacons')
      .select('*', { count: 'exact', head: true });

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return {
      tweets,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

  } catch (error) {
    console.error('Error fetching unified tweets for SSE:', error);
    throw error;
  }
}

// Periodic update function
async function periodicUpdate() {
  try {
    const now = Date.now();
    
    // Only update if 5 seconds have passed
    if (now - lastUpdateTime < 5000) {
      return;
    }
    
    lastUpdateTime = now;
    
    // Get fresh tweets data
    const data = await getUnifiedTweets(1, 20); // Get first page for real-time updates
    
    // Check if data has changed
    if (JSON.stringify(data) !== JSON.stringify(lastTweetsData)) {
      lastTweetsData = data;
      
      // Broadcast update to all connected clients
      broadcast({
        type: 'tweets_update',
        data: data,
        timestamp: now
      });
      
      console.log(`📡 SSE: Broadcasted tweets update to ${connections.size} clients`);
    }
    
  } catch (error) {
    console.error('Error in periodic SSE update:', error);
  }
}

// Start periodic updates
setInterval(periodicUpdate, 5000); // Every 5 seconds

module.exports = async (req, res) => {
  // Apply security middleware
  secureAuthMiddleware(req, res, () => {
    handleRequest(req, res);
  });
};

async function handleRequest(req, res) {
  const { ip, userWallet } = req.securityContext;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'SSE connection established',
    timestamp: Date.now()
  })}\n\n`);

  // Add connection to set
  connections.add(res);
  
  logAuditEvent(ip, 'GET', req.url, userWallet, 'SSE_CONNECTED');

  // Send initial data
  try {
    const data = await getUnifiedTweets(1, 20, userWallet);
    res.write(`data: ${JSON.stringify({
      type: 'initial_data',
      data: data,
      timestamp: Date.now()
    })}\n\n`);
  } catch (error) {
    console.error('Error sending initial SSE data:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: 'Failed to load initial data',
      timestamp: Date.now()
    })}\n\n`);
  }

  // Handle client disconnect
  req.on('close', () => {
    connections.delete(res);
    logAuditEvent(ip, 'DISCONNECT', req.url, userWallet, 'SSE_DISCONNECTED');
    console.log(`📡 SSE: Client disconnected. ${connections.size} clients remaining`);
  });

  // Send ping every 30 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      })}\n\n`);
    } catch (error) {
      clearInterval(pingInterval);
      connections.delete(res);
    }
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
  });
}

// Export broadcast function for use by other modules
module.exports.broadcast = broadcast;
module.exports.broadcastNewTweet = (tweet) => {
  broadcast({
    type: 'new_tweet',
    data: tweet,
    timestamp: Date.now()
  });
};

module.exports.broadcastTweetUpdate = (tweet) => {
  broadcast({
    type: 'tweet_update',
    data: tweet,
    timestamp: Date.now()
  });
};
