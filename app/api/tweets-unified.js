const { createClient } = require('@supabase/supabase-js');
const { 
  secureAuthMiddleware, 
  sanitizeInput, 
  validateWalletAddress, 
  logAuditEvent 
} = require('./secure-auth-middleware');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  // Don't throw error on startup, handle it in the request handler
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Cache for tweets data
const tweetsCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Validate pagination parameters
function validatePaginationParams(page, limit) {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  
  if (pageNum < 1 || pageNum > 1000) {
    return { valid: false, error: 'Page must be between 1 and 1000' };
  }
  
  if (limitNum < 1 || limitNum > 100) {
    return { valid: false, error: 'Limit must be between 1 and 100' };
  }
  
  return { valid: true, page: pageNum, limit: limitNum };
}

// Get unified tweet data with all sub-data
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
    console.error('Error fetching unified tweets:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  // Apply security middleware
  secureAuthMiddleware(req, res, () => {
    handleRequest(req, res);
  });
};

async function handleRequest(req, res) {
  // Check environment variables
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Missing required environment variables' 
    });
  }

  try {
    const { method } = req;
    const { page, limit, userWallet } = req.query;
    const { ip, userWallet: contextWallet } = req.securityContext;

    if (method === 'GET') {
      // Validate pagination parameters
      const paginationValidation = validatePaginationParams(page, limit);
      if (!paginationValidation.valid) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_PAGINATION', { error: paginationValidation.error });
        return res.status(400).json({ error: paginationValidation.error });
      }

      const { page: validPage, limit: validLimit } = paginationValidation;
      const queryUserWallet = userWallet || contextWallet;

      // Check cache first
      const cacheKey = `tweets_${validPage}_${validLimit}_${queryUserWallet || 'anonymous'}`;
      const cached = tweetsCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        logAuditEvent(ip, method, req.url, contextWallet, 'TWEETS_CACHE_HIT', { page: validPage, limit: validLimit });
        return res.json({ success: true, ...cached.data });
      }

      // Fetch unified tweets data
      const data = await getUnifiedTweets(validPage, validLimit, queryUserWallet);

      // Cache the result
      tweetsCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      // Clean up old cache entries
      const now = Date.now();
      for (const [key, value] of tweetsCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          tweetsCache.delete(key);
        }
      }

      logAuditEvent(ip, method, req.url, contextWallet, 'TWEETS_FETCHED', { 
        page: validPage, 
        limit: validLimit, 
        count: data.tweets.length 
      });

      return res.json({ success: true, ...data });

    } else {
      logAuditEvent(ip, method, req.url, contextWallet, 'METHOD_NOT_ALLOWED');
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Unified tweets API error:', error);
    logAuditEvent(req.securityContext?.ip || 'unknown', req.method, req.url, req.securityContext?.userWallet, 'INTERNAL_ERROR', { error: error.message });
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
}
