const { authMiddleware, sendSecureError, validateRequiredFields } = require('./auth-middleware');
const SecureDatabase = require('./secure-database');
const secureX402 = require('./secure-x402');
const config = require('./secure-config');

module.exports = async (req, res) => {
  // Apply authentication middleware
  authMiddleware(req, res, () => {
    handlePlatformDepositRequest(req, res);
  });
};

async function handlePlatformDepositRequest(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return sendSecureError(res, 405, 'Method not allowed');
    }

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['recipient', 'amount', 'user']);
    if (!validation.isValid) {
      return sendSecureError(res, 400, `Validation failed: ${validation.errors.join(', ')}`);
    }

    const { recipient, amount, user } = validation.sanitized;

    console.log('💰 Secure platform deposit request:', { recipient, amount, user });

    // Check for x402 proof in headers
    const x402Proof = req.headers['x-402-proof'];

    if (!x402Proof) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires a SOL payment',
        payment: secureX402.createPaymentRequest(recipient, amount),
      });
    }

    // Parse and validate proof
    let proof;
    try {
      proof = JSON.parse(x402Proof);
    } catch (error) {
      return sendSecureError(res, 400, 'Invalid proof format');
    }

    // Verify payment using secure service
    console.log('🔍 Verifying platform deposit proof:', proof);
    const verification = await secureX402.verifyPayment(proof, recipient, amount);
    console.log('🔍 Platform deposit verification result:', verification);
    
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        payment: secureX402.createPaymentRequest(recipient, amount),
      });
    }

    // Create platform transaction record
    const transactionData = {
      user_wallet: user,
      platform_wallet: recipient,
      amount: parseFloat(amount),
      transaction: proof.transaction,
      timestamp: Date.now(),
      type: 'deposit',
      recipient: null,
      message: 'Platform wallet deposit'
    };

    // Save transaction using secure database service
    const savedTransaction = await SecureDatabase.createPlatformTransaction(transactionData);
    console.log('✅ Platform deposit saved to database:', savedTransaction);

    return res.status(200).json({
      success: true,
      message: 'Platform deposit successful',
      transaction: savedTransaction,
      payment: {
        transaction: proof.transaction,
        amount: verification.amount,
      },
    });

  } catch (error) {
    console.error('❌ Secure platform deposit API error:', error);
    return sendSecureError(res, 500, 'Failed to process platform deposit request', error);
  }
}
