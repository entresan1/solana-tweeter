// Using built-in fetch (Node.js 18+)

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { quoteResponse, userPublicKey } = req.body;

  if (!quoteResponse || !userPublicKey) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      required: ['quoteResponse', 'userPublicKey']
    });
  }

  try {
    console.log('🔄 Jupiter swap proxy: Creating swap transaction');
    console.log('🔄 Swap request:', { 
      userPublicKey, 
      quoteResponse: quoteResponse ? 'present' : 'missing',
      quoteKeys: quoteResponse ? Object.keys(quoteResponse) : []
    });
    
    const swapUrl = 'https://quote-api.jup.ag/v6/swap';
    
    const swapPayload = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    };
    
    console.log('🔄 Sending to Jupiter swap API:', swapUrl);
    
    const response = await fetch(swapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'SolanaTweeter/1.0'
      },
      body: JSON.stringify(swapPayload)
    });

    console.log('🔄 Jupiter swap API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Jupiter swap API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Jupiter swap API error',
        status: response.status,
        message: errorText
      });
    }

    const data = await response.json();
    console.log('✅ Jupiter swap proxy: Transaction created successfully');
    console.log('✅ Swap data keys:', Object.keys(data));
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ Jupiter swap proxy error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Swap proxy error',
      message: error.message,
      details: error.stack
    });
  }
};
