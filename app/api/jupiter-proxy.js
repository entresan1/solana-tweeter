// Using built-in fetch (Node.js 18+)

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { inputMint, outputMint, amount, slippageBps } = req.query;

  if (!inputMint || !outputMint || !amount) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      required: ['inputMint', 'outputMint', 'amount']
    });
  }

  try {
    console.log('🔄 Jupiter proxy: Getting quote from Jupiter API');
    console.log('🔄 Request params:', { inputMint, outputMint, amount, slippageBps });
    
    // Build Jupiter API URL
    const jupiterUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps || 50}`;
    
    console.log('🔄 Jupiter proxy URL:', jupiterUrl);

    const response = await fetch(jupiterUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SolanaTweeter/1.0'
      }
    });

    console.log('🔄 Jupiter API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Jupiter API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Jupiter API error',
        status: response.status,
        message: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Jupiter proxy: Quote received successfully');
    console.log('✅ Quote data:', { 
      inAmount: data.inAmount, 
      outAmount: data.outAmount, 
      priceImpact: data.priceImpactPct 
    });
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Jupiter proxy error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      details: error.stack
    });
  }
};
