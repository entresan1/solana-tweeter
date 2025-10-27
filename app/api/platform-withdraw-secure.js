const { authMiddleware, sendSecureError, validateRequiredFields } = require('./auth-middleware');
const SecureDatabase = require('./secure-database');
const secureX402 = require('./secure-x402');
const config = require('./secure-config');
const { Connection, Keypair, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Apply authentication middleware
  authMiddleware(req, res, () => {
    handlePlatformWithdrawRequest(req, res);
  });
};

async function handlePlatformWithdrawRequest(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return sendSecureError(res, 405, 'Method not allowed');
    }

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['user', 'amount']);
    if (!validation.isValid) {
      return sendSecureError(res, 400, `Validation failed: ${validation.errors.join(', ')}`);
    }

    const { user, amount } = validation.sanitized;
    const withdrawAmount = parseFloat(amount);

    // Validate amount
    if (withdrawAmount <= 0 || withdrawAmount > 10) {
      return sendSecureError(res, 400, 'Invalid withdrawal amount');
    }

    console.log('💰 Secure platform withdraw request:', { user, amount: withdrawAmount });

    // Generate platform wallet address
    const platformWalletAddress = secureX402.generatePlatformWalletAddress(user);
    
    // Get platform wallet balance
    const connection = new Connection(config.solana.rpcUrl, 'confirmed');
    const platformWalletPubkey = new PublicKey(platformWalletAddress);
    const balance = await connection.getBalance(platformWalletPubkey);
    const balanceSOL = balance / 1000000000; // Convert lamports to SOL

    if (balanceSOL < withdrawAmount) {
      return sendSecureError(res, 400, 'Insufficient platform wallet balance');
    }

    // Generate platform wallet keypair
    const platformKeypair = generatePlatformWalletKeypair(user);

    // Create withdrawal transaction
    const transaction = new Transaction();
    const recipientPubkey = new PublicKey(user);
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: platformWalletPubkey,
        toPubkey: recipientPubkey,
        lamports: Math.floor(withdrawAmount * 1000000000) // Convert SOL to lamports
      })
    );

    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = platformWalletPubkey;

    // Sign transaction with platform wallet
    transaction.sign(platformKeypair);

    // Send transaction
    const signature = await connection.sendTransaction(transaction, [platformKeypair]);
    console.log('✅ Withdrawal transaction sent:', signature);

    // Create platform transaction record
    const transactionData = {
      user_wallet: user,
      platform_wallet: platformWalletAddress,
      amount: withdrawAmount,
      transaction: signature,
      timestamp: Date.now(),
      type: 'withdrawal',
      recipient: user,
      message: 'Platform wallet withdrawal'
    };

    // Save transaction using secure database service
    const savedTransaction = await SecureDatabase.createPlatformTransaction(transactionData);
    console.log('✅ Platform withdrawal saved to database:', savedTransaction);

    return res.status(200).json({
      success: true,
      message: 'Platform withdrawal successful',
      transaction: savedTransaction,
      signature: signature,
      amount: withdrawAmount
    });

  } catch (error) {
    console.error('❌ Secure platform withdraw API error:', error);
    return sendSecureError(res, 500, 'Failed to process platform withdrawal request', error);
  }
}

/**
 * Generate platform wallet keypair (same as in platform-wallet-secure.js)
 */
function generatePlatformWalletKeypair(userWallet) {
  const secretKey = config.platformWallet.secret;
  const salt = config.platformWallet.salt;
  
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(salt + userWallet);
  const hash = hmac.digest();
  
  return Keypair.fromSeed(hash.slice(0, 32));
}
