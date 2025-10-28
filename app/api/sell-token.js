const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  // Don't throw error on startup, handle it in the request handler
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
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userWallet, tokenMint, amount } = req.body;

  if (!userWallet || !tokenMint || !amount) {
    return res.status(400).json({ error: 'Missing required fields: userWallet, tokenMint, amount' });
  }

  try {
    // For now, just log the sale (you can integrate with actual token selling later)
    console.log('Token Sale:', {
      userWallet,
      tokenMint,
      amount,
      timestamp: new Date().toISOString()
    });

    // Mock successful sale
    const sale = {
      id: Date.now(),
      userWallet,
      tokenMint,
      amount,
      price: 0.001, // Mock price
      totalValue: amount * 0.001,
      created_at: new Date().toISOString()
    };

    return res.status(200).json({ 
      success: true, 
      sale,
      message: `Successfully sold ${amount} tokens of ${tokenMint}`
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
