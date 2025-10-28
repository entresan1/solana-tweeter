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

// Validate reply content
function validateReplyContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Reply content is required' };
  }
  
  const sanitized = sanitizeInput(content).trim();
  
  if (sanitized.length === 0) {
    return { valid: false, error: 'Reply content cannot be empty' };
  }
  
  if (sanitized.length > 1000) {
    return { valid: false, error: 'Reply content is too long (max 1000 characters)' };
  }
  
  return { valid: true, content: sanitized };
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
    const { beaconId, userWallet, content } = method === 'GET' ? req.query : req.body;
    const { ip, userWallet: contextWallet } = req.securityContext;

    if (method === 'GET') {
      // Get replies for a beacon
      if (!beaconId) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_REQUEST', { error: 'Missing beacon ID' });
        return res.status(400).json({ error: 'Beacon ID is required' });
      }

      if (!validateBeaconId(beaconId)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_BEACON_ID', { beaconId });
        return res.status(400).json({ error: 'Invalid beacon ID format' });
      }

      const { data, error } = await supabase
        .from('beacon_replies')
        .select('*')
        .eq('beacon_id', parseInt(beaconId))
        .order('created_at', { ascending: true });

      if (error) {
        logAuditEvent(ip, method, req.url, contextWallet, 'REPLIES_FETCH_ERROR', { beaconId, error: error.message });
        throw error;
      }

      logAuditEvent(ip, method, req.url, contextWallet, 'REPLIES_FETCHED', { beaconId, count: data?.length || 0 });
      return res.json({ success: true, replies: data || [] });

    } else if (method === 'POST') {
      // Create a new reply
      if (!beaconId || !userWallet || !content) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_REQUEST', { error: 'Missing required fields' });
        return res.status(400).json({ error: 'Beacon ID, user wallet, and content are required' });
      }

      if (!validateBeaconId(beaconId)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_BEACON_ID', { beaconId });
        return res.status(400).json({ error: 'Invalid beacon ID format' });
      }

      if (!validateWalletAddress(userWallet)) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_WALLET_ADDRESS', { walletAddress: userWallet });
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      // Validate reply content
      const contentValidation = validateReplyContent(content);
      if (!contentValidation.valid) {
        logAuditEvent(ip, method, req.url, contextWallet, 'INVALID_REPLY_CONTENT', { error: contentValidation.error });
        return res.status(400).json({ error: contentValidation.error });
      }

      const { data, error } = await supabase
        .from('beacon_replies')
        .insert([{
          beacon_id: parseInt(beaconId),
          user_wallet: userWallet,
          content: contentValidation.content
        }])
        .select()
        .single();

      if (error) {
        logAuditEvent(ip, method, req.url, contextWallet, 'REPLY_CREATE_ERROR', { beaconId, userWallet, error: error.message });
        throw error;
      }

      logAuditEvent(ip, method, req.url, contextWallet, 'REPLY_CREATED', { beaconId, userWallet, replyId: data.id });
      return res.json({ success: true, reply: data });

    } else {
      logAuditEvent(ip, method, req.url, contextWallet, 'METHOD_NOT_ALLOWED');
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Beacon replies API error:', error);
    logAuditEvent(req.securityContext?.ip || 'unknown', req.method, req.url, req.securityContext?.userWallet, 'INTERNAL_ERROR', { error: error.message });
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
};
