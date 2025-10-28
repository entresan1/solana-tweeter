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
        
        // Use real QuickNode API to fetch portfolio
        const { Connection, PublicKey } = require('@solana/web3.js');
        const rpcUrl = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC_URL || 'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/';
        const connection = new Connection(rpcUrl, 'confirmed');
        
        const walletPubkey = new PublicKey(walletAddress);
        
        // Get token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
        });
        
        // Get SOL balance
        const solBalance = await connection.getBalance(walletPubkey);
        const solAmount = solBalance / 1000000000; // Convert lamports to SOL
        
        const portfolio = {
          walletAddress: walletAddress,
          items: [],
          updatedAt: new Date().toISOString()
        };
        
        // Add SOL to portfolio
        if (solAmount > 0) {
          portfolio.items.push({
            mint: 'So11111111111111111111111111111111111111112',
            symbol: 'SOL',
            amount: solBalance.toString(),
            uiAmount: solAmount,
            usdValue: solAmount * 100 // Approximate USD value
          });
        }
        
        // Add SPL tokens
        for (const tokenAccount of tokenAccounts.value) {
          const tokenInfo = tokenAccount.account.data.parsed.info;
          const amount = tokenInfo.tokenAmount.uiAmount;
          
          if (amount > 0) {
            portfolio.items.push({
              mint: tokenInfo.mint,
              symbol: tokenInfo.mint.slice(0, 4).toUpperCase(), // Use first 4 chars as symbol
              amount: tokenInfo.tokenAmount.amount,
              uiAmount: amount,
              usdValue: amount * 0.1 // Approximate USD value
            });
          }
        }
        
        console.log('✅ Portfolio fetched successfully:', portfolio.items.length, 'tokens');
        return res.status(200).json(portfolio);
  } catch (error) {
    console.error('Portfolio error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
