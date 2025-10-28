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
    // For now, create a mock quote since Jupiter API is having issues
    // In production, you would use the real Jupiter API
    const mockQuote = {
      inputAmount: Math.floor(parseFloat(solAmount) * 1e9), // Convert to lamports
      outputAmount: Math.floor(parseFloat(solAmount) * 1e6), // Mock output (1:1000 ratio)
      priceImpact: 0.5, // Mock price impact
      route: 1, // Mock route count
      success: true
    };
    
    console.log('Using mock quote for:', { contractAddress, solAmount });

    // No fees - full amount for swap
    const swapAmount = parseFloat(solAmount);

    return res.status(200).json({
      success: true,
      quote: {
        inputAmount: mockQuote.inputAmount,
        outputAmount: mockQuote.outputAmount,
        priceImpact: mockQuote.priceImpact,
        route: mockQuote.route,
        inputSymbol: 'SOL',
        outputSymbol: contractAddress.slice(0, 4).toUpperCase(),
        inputAmountFormatted: `${solAmount} SOL`,
        outputAmountFormatted: `${(mockQuote.outputAmount / 1e6).toFixed(6)} ${contractAddress.slice(0, 4).toUpperCase()}`,
        priceImpactFormatted: `${mockQuote.priceImpact}%`
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
      success: false,
      error: 'Internal server error', 
      details: error.message,
      message: 'Failed to get swap quote. Please try again.'
    });
  }
};
