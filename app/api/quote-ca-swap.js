const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  const { contractAddress, solAmount } = req.query;

  if (!contractAddress || !solAmount) {
    return res.status(400).json({ 
      error: 'Missing required parameters: contractAddress, solAmount' 
    });
  }

  try {
    // Import Jupiter quote function
    const { getJupiterQuote } = require('../src/lib/jupiter-swap');
    
    // Get quote for SOL → CA token swap
    const quote = await getJupiterQuote(contractAddress, parseFloat(solAmount));
    
    if (!quote.success) {
      return res.status(400).json({
        success: false,
        error: quote.error || 'Failed to get quote',
        message: 'Unable to get swap quote. Token may not be tradeable or liquidity may be insufficient.'
      });
    }

    // No fees - full amount for swap
    const swapAmount = parseFloat(solAmount);

    return res.status(200).json({
      success: true,
      quote: {
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        priceImpact: quote.priceImpact,
        route: quote.route,
        inputSymbol: 'SOL',
        outputSymbol: contractAddress.slice(0, 4).toUpperCase(),
        inputAmountFormatted: `${solAmount} SOL`,
        outputAmountFormatted: `${(quote.outputAmount / 1e6).toFixed(6)} ${contractAddress.slice(0, 4).toUpperCase()}`,
        priceImpactFormatted: `${quote.priceImpact}%`
      },
      fees: {
        swapAmount: swapAmount,
        totalCost: parseFloat(solAmount)
      },
      contractAddress: contractAddress
    });

  } catch (error) {
    console.error('Quote error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
