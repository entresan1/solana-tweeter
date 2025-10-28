const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  // Don't throw error on startup, handle it in the request handler
}

// Only create client if we have valid credentials
let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

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

  const { walletAddress } = req.query;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Missing walletAddress parameter' });
  }

  try {
    console.log('Platform portfolio request for wallet:', walletAddress);
    console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'Missing');
    console.log('Supabase Client:', supabase ? 'Created' : 'Not created');
    
    // Get platform wallet address for the user
    const platformWalletAddress = `platform_${walletAddress}`;
    
    // Get CA purchases for this user (optional, don't fail if table doesn't exist)
    let purchases = [];
    if (supabase) {
      try {
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('ca_purchases')
          .select('*')
          .eq('buyer_wallet', walletAddress)
          .order('created_at', { ascending: false });

        if (purchasesError) {
          console.error('Failed to fetch CA purchases:', purchasesError);
        } else {
          purchases = purchasesData || [];
        }
      } catch (purchaseError) {
        console.error('CA purchases table error:', purchaseError);
        // Continue without purchases data
      }
    } else {
      console.log('Supabase client not available, skipping purchases fetch');
    }

    // Mock portfolio data for now (you can integrate with actual token data later)
    const mockTokens = [
      {
        mint: 'So11111111111111111111111111111111111111112', // SOL
        symbol: 'SOL',
        name: 'Solana',
        balance: 0.5,
        decimals: 9,
        price: 100,
        value: 50
      },
      {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        balance: 1000,
        decimals: 6,
        price: 1,
        value: 1000
      }
    ];

    // Add tokens from CA purchases
    const caTokens = (purchases || []).map(purchase => ({
      mint: purchase.contract_address,
      symbol: 'CA',
      name: `Contract ${purchase.contract_address.slice(0, 8)}...`,
      balance: 1, // Mock balance
      decimals: 9,
      price: 0.001, // Mock price
      value: 0.001
    }));

    const allTokens = [...mockTokens, ...caTokens];
    const totalValue = allTokens.reduce((sum, token) => sum + (token.value || 0), 0);

    // Generate secure private key using HMAC (same as platform wallet generation)
    const crypto = require('crypto');
    const secretKey = process.env.PLATFORM_WALLET_SECRET;
    const salt = process.env.PLATFORM_WALLET_SALT;
    
    if (!secretKey || !salt) {
      throw new Error('Missing required environment variables: PLATFORM_WALLET_SECRET and PLATFORM_WALLET_SALT');
    }
    
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(salt + walletAddress);
    const privateKey = hmac.digest('hex');

    const portfolio = {
      tokens: allTokens,
      totalValue,
      walletAddress: platformWalletAddress,
      privateKey
    };

    return res.status(200).json({ 
      success: true, 
      portfolio 
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
