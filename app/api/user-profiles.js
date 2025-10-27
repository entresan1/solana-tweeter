const { createClient } = require('@supabase/supabase-js');
const { 
  secureAuthMiddleware, 
  sanitizeInput, 
  validateWalletAddress, 
  logAuditEvent 
} = require('./secure-auth-middleware');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voskmcxmtvophehityoa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple cache to avoid repeated queries for non-existent profiles
const profileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Validate profile data
function validateProfileData(profile) {
  if (!profile || typeof profile !== 'object') {
    return { valid: false, error: 'Profile data is required' };
  }
  
  if (!profile.wallet_address || !validateWalletAddress(profile.wallet_address)) {
    return { valid: false, error: 'Valid wallet address is required' };
  }
  
  // Sanitize and validate fields
  const sanitizedProfile = {
    wallet_address: profile.wallet_address,
    nickname: profile.nickname ? sanitizeInput(profile.nickname).substring(0, 50) : null,
    profile_picture_url: profile.profile_picture_url ? sanitizeInput(profile.profile_picture_url).substring(0, 500) : null,
    bio: profile.bio ? sanitizeInput(profile.bio).substring(0, 500) : null
  };
  
  // Validate URL format for profile picture
  if (sanitizedProfile.profile_picture_url) {
    try {
      new URL(sanitizedProfile.profile_picture_url);
    } catch {
      return { valid: false, error: 'Invalid profile picture URL format' };
    }
  }
  
  return { valid: true, profile: sanitizedProfile };
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
    const { walletAddress, profile } = method === 'GET' ? req.query : req.body;
    const { ip, userWallet } = req.securityContext;

    if (method === 'GET') {
      // Get user profile by wallet address
      if (!walletAddress) {
        logAuditEvent(ip, method, req.url, userWallet, 'INVALID_REQUEST', { error: 'Missing wallet address' });
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      // Check cache first
      const cached = profileCache.get(walletAddress);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_CACHE_HIT', { walletAddress });
        return res.json({ success: true, profile: cached.profile });
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is normal
          profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
          logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_NOT_FOUND', { walletAddress });
          return res.json({ success: true, profile: null });
        } else if (error.code === 'PGRST301' || error.message?.includes('406')) {
          // 406 Not Acceptable - likely RLS issue, treat as no profile found
          profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
          logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_ACCESS_DENIED', { walletAddress });
          return res.json({ success: true, profile: null });
        } else {
          logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_FETCH_ERROR', { walletAddress, error: error.message });
          throw error;
        }
      }

      // Cache successful result
      profileCache.set(walletAddress, { profile: data, timestamp: Date.now() });
      logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_FETCHED', { walletAddress });
      return res.json({ success: true, profile: data });

    } else if (method === 'POST') {
      // Create or update user profile
      if (!profile || !profile.wallet_address) {
        logAuditEvent(ip, method, req.url, userWallet, 'INVALID_REQUEST', { error: 'Missing profile data' });
        return res.status(400).json({ error: 'Profile data with wallet_address is required' });
      }

      // Validate profile data
      const validation = validateProfileData(profile);
      if (!validation.valid) {
        logAuditEvent(ip, method, req.url, userWallet, 'INVALID_PROFILE_DATA', { error: validation.error });
        return res.status(400).json({ error: validation.error });
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert([{
          ...validation.profile,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'wallet_address'
        })
        .select()
        .single();

      if (error) {
        logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_UPSERT_ERROR', { walletAddress: validation.profile.wallet_address, error: error.message });
        throw error;
      }

      // Clear cache for this wallet address
      profileCache.delete(validation.profile.wallet_address);
      logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_UPSERTED', { walletAddress: validation.profile.wallet_address });
      return res.json({ success: true, profile: data });

    } else if (method === 'PUT') {
      // Update specific profile fields
      if (!walletAddress) {
        logAuditEvent(ip, method, req.url, userWallet, 'INVALID_REQUEST', { error: 'Missing wallet address' });
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      if (!profile) {
        logAuditEvent(ip, method, req.url, userWallet, 'INVALID_REQUEST', { error: 'Missing profile data' });
        return res.status(400).json({ error: 'Profile data is required' });
      }

      // Validate profile data
      const validation = validateProfileData({ ...profile, wallet_address: walletAddress });
      if (!validation.valid) {
        logAuditEvent(ip, method, req.url, userWallet, 'INVALID_PROFILE_DATA', { error: validation.error });
        return res.status(400).json({ error: validation.error });
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...validation.profile,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress)
        .select()
        .single();

      if (error) {
        logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_UPDATE_ERROR', { walletAddress, error: error.message });
        throw error;
      }

      // Clear cache for this wallet address
      profileCache.delete(walletAddress);
      logAuditEvent(ip, method, req.url, userWallet, 'PROFILE_UPDATED', { walletAddress });
      return res.json({ success: true, profile: data });

    } else {
      logAuditEvent(ip, method, req.url, userWallet, 'METHOD_NOT_ALLOWED');
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ User profiles API error:', error);
    logAuditEvent(req.securityContext?.ip || 'unknown', req.method, req.url, req.securityContext?.userWallet, 'INTERNAL_ERROR', { error: error.message });
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
};
