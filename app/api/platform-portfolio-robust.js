module.exports = async (req, res) => {
  // Set CORS headers first
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
    console.log('🔗 Fetching portfolio for wallet:', walletAddress);
    
    // For now, return mock data to ensure API works
    const mockTokens = [
      {
        mint: 'So11111111111111111111111111111111111111112', // SOL
        symbol: 'SOL',
        name: 'Solana',
        balance: 0.0779,
        decimals: 9,
        price: 100,
        value: 7.79
      },
      {
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        symbol: 'USDC',
        name: 'USD Coin',
        balance: 100,
        decimals: 6,
        price: 1,
        value: 100
      }
    ];

    const totalValue = mockTokens.reduce((sum, token) => sum + token.value, 0);

    const portfolio = {
      walletAddress: `platform_${walletAddress}`,
      items: mockTokens.map(token => ({
        mint: token.mint,
        symbol: token.symbol,
        amount: (token.balance * Math.pow(10, token.decimals)).toString(),
        uiAmount: token.balance,
        usdValue: token.value
      })),
      updatedAt: new Date().toISOString()
    };

    return res.status(200).json(portfolio);
  } catch (error) {
    console.error('Portfolio error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
