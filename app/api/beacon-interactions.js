const { createClient } = require('@supabase/supabase-js');
const { 
  secureAuthMiddleware, 
  sanitizeInput, 
  validateWalletAddress, 
  logAuditEvent 
} = require('./secure-auth-middleware');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Validate beacon ID
function validateBeaconId(beaconId) {
  const id = parseInt(beaconId);
  return !isNaN(id) && id > 0 && id < Number.MAX_SAFE_INTEGER;
}

// Validate action
function validateAction(action) {
  return ['like', 'rug'].includes(action);
}

module.exports = async (req, res) => {
  // Apply security middleware
  secureAuthMiddleware(req, res, () => {
    handleRequest(req, res);
  });
};

async function handleRequest(req, res) {

  try {
    const { method } = req;
    const { beaconId, userWallet, action } = method === 'GET' ? req.query : req.body;
    const { ip, userWallet: contextWallet } = req.securityContext;

    if (method === 'GET') {
      // Get interaction data for a beacon
      if (!beaconId) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_REQUEST', { error: 'Missing beacon ID' });
        return res.status(400).json({ error: 'Beacon ID is required' });
      }

      if (!validateBeaconId(beaconId)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_BEACON_ID', { beaconId });
        return res.status(400).json({ error: 'Invalid beacon ID format' });
      }

      const { userWallet: queryWallet } = req.query;

      // Validate wallet address if provided
      if (queryWallet && !validateWalletAddress(queryWallet)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_WALLET_ADDRESS', { walletAddress: queryWallet });
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      // Get like count
      const { count: likeCount, error: likeError } = await supabase
        .from('beacon_likes')
        .select('*', { count: 'exact', head: true })
        .eq('beacon_id', parseInt(beaconId));

      if (likeError) {
        logAuditEvent(ip, method, req.url, contextWallet, 'LIKE_COUNT_ERROR', { beaconId, error: likeError.message });
        throw likeError;
      }

      // Get rug count
      const { count: rugCount, error: rugError } = await supabase
        .from('rug_reports')
        .select('*', { count: 'exact', head: true })
        .eq('beacon_id', parseInt(beaconId));

      if (rugError) {
        logAuditEvent(ip, method, req.url, contextWallet, 'RUG_COUNT_ERROR', { beaconId, error: rugError.message });
        throw rugError;
      }

      let hasUserLiked = false;
      let hasUserRugged = false;

      // Check if user has liked/rugged (if wallet provided)
      if (queryWallet) {
        const { data: likeData } = await supabase
          .from('beacon_likes')
          .select('id')
          .eq('beacon_id', parseInt(beaconId))
          .eq('user_wallet', queryWallet)
          .single();

        const { data: rugData } = await supabase
          .from('rug_reports')
          .select('id')
          .eq('beacon_id', parseInt(beaconId))
          .eq('user_wallet', queryWallet)
          .single();

        hasUserLiked = !!likeData;
        hasUserRugged = !!rugData;
      }

      logAuditEvent(ip, method, req.url, contextWallet, 'INTERACTIONS_FETCHED', { beaconId, queryWallet });
      return res.json({
        success: true,
        likeCount: likeCount || 0,
        rugCount: rugCount || 0,
        hasUserLiked,
        hasUserRugged
      });

    } else if (method === 'POST') {
      // Like or rug a beacon
      if (!beaconId || !userWallet || !action) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_REQUEST', { error: 'Missing required fields' });
        return res.status(400).json({ error: 'Beacon ID, user wallet, and action are required' });
      }

      if (!validateBeaconId(beaconId)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_BEACON_ID', { beaconId });
        return res.status(400).json({ error: 'Invalid beacon ID format' });
      }

      if (!validateWalletAddress(userWallet)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_WALLET_ADDRESS', { walletAddress: userWallet });
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      if (!validateAction(action)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_ACTION', { action });
        return res.status(400).json({ error: 'Invalid action. Must be "like" or "rug"' });
      }

      if (action === 'like') {
        const { data, error } = await supabase
          .from('beacon_likes')
          .insert([{
            beacon_id: parseInt(beaconId),
            user_wallet: userWallet
          }])
          .select()
          .single();

        if (error) {
          logAuditEvent(ip, method, req.url, contextWallet, 'LIKE_ERROR', { beaconId, userWallet, error: error.message });
          throw error;
        }

        logAuditEvent(ip, method, req.url, contextWallet, 'BEACON_LIKED', { beaconId, userWallet });
        return res.json({ success: true, like: data });

      } else if (action === 'rug') {
        const { data, error } = await supabase
          .from('rug_reports')
          .insert([{
            beacon_id: parseInt(beaconId),
            user_wallet: userWallet
          }])
          .select()
          .single();

        if (error) {
          logAuditEvent(ip, method, req.url, contextWallet, 'RUG_ERROR', { beaconId, userWallet, error: error.message });
          throw error;
        }

        logAuditEvent(ip, method, req.url, contextWallet, 'BEACON_RUGGED', { beaconId, userWallet });
        return res.json({ success: true, rug: data });
      }

    } else if (method === 'DELETE') {
      // Unlike or unrug a beacon
      if (!beaconId || !userWallet || !action) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_REQUEST', { error: 'Missing required fields' });
        return res.status(400).json({ error: 'Beacon ID, user wallet, and action are required' });
      }

      if (!validateBeaconId(beaconId)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_BEACON_ID', { beaconId });
        return res.status(400).json({ error: 'Invalid beacon ID format' });
      }

      if (!validateWalletAddress(userWallet)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_WALLET_ADDRESS', { walletAddress: userWallet });
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      if (!validateAction(action)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_ACTION', { action });
        return res.status(400).json({ error: 'Invalid action. Must be "like" or "rug"' });
      }

      if (action === 'like') {
        const { error } = await supabase
          .from('beacon_likes')
          .delete()
          .eq('beacon_id', parseInt(beaconId))
          .eq('user_wallet', userWallet);

        if (error) {
          logAuditEvent(ip, method, req.url, contextWallet, 'UNLIKE_ERROR', { beaconId, userWallet, error: error.message });
          throw error;
        }

        logAuditEvent(ip, method, req.url, contextWallet, 'BEACON_UNLIKED', { beaconId, userWallet });
        return res.json({ success: true });

      } else if (action === 'rug') {
        const { error } = await supabase
          .from('rug_reports')
          .delete()
          .eq('beacon_id', parseInt(beaconId))
          .eq('user_wallet', userWallet);

        if (error) {
          logAuditEvent(ip, method, req.url, contextWallet, 'UNRUG_ERROR', { beaconId, userWallet, error: error.message });
          throw error;
        }

        logAuditEvent(ip, method, req.url, contextWallet, 'BEACON_UNRUGGED', { beaconId, userWallet });
        return res.json({ success: true });
      }

    } else {
      logAuditEvent(ip, method, req.url, contextWallet, 'METHOD_NOT_ALLOWED');
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Beacon interactions API error:', error);
    logAuditEvent(req.securityContext?.ip || 'unknown', req.method, req.url, req.securityContext?.userWallet, 'INTERNAL_ERROR', { error: error.message });
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
};
