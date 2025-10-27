const { authMiddleware, sendSecureError, validateRequiredFields } = require('./auth-middleware');
const SecureDatabase = require('./secure-database');
const secureX402 = require('./secure-x402');
const config = require('./secure-config');

module.exports = async (req, res) => {
  // Apply authentication middleware
  authMiddleware(req, res, () => {
    handleTipRequest(req, res);
  });
};

async function handleTipRequest(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return sendSecureError(res, 405, 'Method not allowed');
    }

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['recipient', 'amount', 'message']);
    if (!validation.isValid) {
      return sendSecureError(res, 400, `Validation failed: ${validation.errors.join(', ')}`);
    }

    const { recipient, amount, message, beacon_id } = validation.sanitized;

    console.log('💰 Secure tip request:', { recipient, amount, message, beacon_id });

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
    console.log('🔍 Verifying tip payment proof:', proof);
    const verification = await secureX402.verifyPayment(proof, recipient, amount);
    console.log('🔍 Tip payment verification result:', verification);
    
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        payment: secureX402.createPaymentRequest(recipient, amount),
      });
    }

    // Create tip data
    const tipData = {
      tipper: req.authenticatedUser.publicKey,
      recipient: recipient,
      amount: parseFloat(amount),
      message: message,
      beacon_id: beacon_id ? parseInt(beacon_id) : null,
      treasury_transaction: proof.transaction,
      timestamp: Date.now(),
      tipper_display: req.body.tipper_display,
      platform_wallet: req.body.platform_wallet
    };

    // Create tip using secure database service
    const savedTip = await SecureDatabase.createTip(tipData);
    console.log('✅ Tip saved to database:', savedTip);

    return res.status(200).json({
      success: true,
      message: 'Tip sent successfully',
      tip: savedTip,
      payment: {
        transaction: proof.transaction,
        amount: verification.amount,
      },
    });

  } catch (error) {
    console.error('❌ Secure tip API error:', error);
    return sendSecureError(res, 500, 'Failed to process tip request', error);
  }
}
