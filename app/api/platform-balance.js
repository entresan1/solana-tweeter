const { createClient } = require('@supabase/supabase-js');
const config = require('./secure-config');
const secureX402 = require('./secure-x402');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://trenchbeacon.com');
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
    const { user } = req.query;
    
    if (!user) {
      return res.status(400).json({ error: 'user parameter is required' });
    }

    // Generate platform wallet address
    const platformWalletAddress = secureX402.generatePlatformWalletAddress(user);
    
    // Get balance from Solana
    const connection = require('@solana/web3.js').Connection;
    const conn = new connection(config.solana.rpcUrl, 'confirmed');
    const platformWalletPubkey = new (require('@solana/web3.js').PublicKey)(platformWalletAddress);
    
    const balance = await conn.getBalance(platformWalletPubkey);
    const balanceSOL = balance / 1000000000; // Convert lamports to SOL

    return res.status(200).json({
      success: true,
      balance: balanceSOL,
      platformWallet: platformWalletAddress
    });

  } catch (error) {
    console.error('Platform balance API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
