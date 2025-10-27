const { createClient } = require('@supabase/supabase-js');
const { 
  generatePlatformWalletAddress, 
  getPlatformWalletBalance,
  sendFromPlatformWallet,
  savePlatformWalletTransaction,
  connection,
  TREASURY_SOL_ADDRESS 
} = require('./platform-wallet-secure');

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
    const { user, amount } = req.body;

    if (!user || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'user and amount are required',
      });
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number',
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

    // Get platform wallet address for user
    const platformWalletAddress = generatePlatformWalletAddress(user);

    // Check platform wallet balance
    const platformBalance = await getPlatformWalletBalance(user);
    if (platformBalance < withdrawAmount) {
      return res.status(400).json({
        error: 'Insufficient balance',
        message: `Platform wallet balance (${platformBalance.toFixed(6)} SOL) is less than withdrawal amount (${withdrawAmount} SOL)`,
      });
    }

    // Transfer from platform wallet to user's connected wallet
    const signature = await sendFromPlatformWallet(user, user, withdrawAmount);
    const result = { success: true, signature };

    if (result.success) {
      // Record the withdrawal in database
      const withdrawalData = {
        user_wallet: user,
        platform_wallet: platformWalletAddress,
        amount: withdrawAmount,
        transaction: signature,
        timestamp: Date.now(),
        type: 'withdrawal'
      };

      const { data: savedWithdrawal, error: dbError } = await supabase
        .from('platform_deposits')
        .insert([withdrawalData])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save error for withdrawal:', dbError);
        // Don't fail the withdrawal if database save fails
      }

      return res.status(200).json({
        success: true,
        message: 'Withdrawal successful',
        withdrawal: {
          amount: withdrawAmount,
          transaction: result.signature,
          newBalance: platformBalance - withdrawAmount
        }
      });
    } else {
      return res.status(500).json({
        error: 'Withdrawal failed',
        message: result.error || 'Failed to process withdrawal',
      });
    }

  } catch (error) {
    console.error('❌ Platform withdraw API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process withdrawal',
    });
  }
};
