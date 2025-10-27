const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipient, amount, message, beaconId, tipper, tipper_display, treasury_transaction, platform_wallet } = req.body;

    // Validate required fields
    if (!recipient || !amount || !tipper || !beaconId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'recipient, amount, tipper, and beaconId are required',
      });
    }

    // Validate amount
    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount < 0.001 || tipAmount > 10) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Tip amount must be between 0.001 and 10 SOL',
      });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'Database configuration missing',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save tip to database
    const tipData = {
      recipient,
      amount: tipAmount,
      message: message || '',
      beacon_id: beaconId,
      tipper,
      tipper_display: tipper_display || tipper.slice(0, 8) + '...',
      timestamp: Date.now(),
      treasury_transaction: treasury_transaction,
      platform_wallet: platform_wallet || false,
    };

    console.log('💾 Saving tip to database:', tipData);

    const { data: savedTip, error: dbError } = await supabase
      .from('tips')
      .insert([tipData])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database save error:', dbError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to save tip to database',
      });
    }

    console.log('✅ Tip saved to database:', savedTip);

    return res.status(200).json({
      success: true,
      message: 'Tip saved successfully',
      tip: savedTip,
    });

  } catch (error) {
    console.error('❌ Save tip API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save tip',
    });
  }
};
