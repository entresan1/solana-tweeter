const { authMiddleware, sendSecureError } = require('./auth-middleware');
const SecureDatabase = require('./secure-database');
const secureX402 = require('./secure-x402');
const config = require('./secure-config');

module.exports = async (req, res) => {
  // Apply authentication middleware
  authMiddleware(req, res, () => {
    handleBeaconRequest(req, res);
  });
};

async function handleBeaconRequest(req, res) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return sendSecureError(res, 405, 'Method not allowed');
    }

    console.log('🔍 Secure beacon request body:', req.body);

    // Check for x402 proof in headers
    const x402Proof = req.headers['x-402-proof'];

    if (!x402Proof) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires a 0.001 SOL payment',
        payment: secureX402.createPaymentRequest(),
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
    console.log('🔍 Verifying payment proof:', proof);
    const verification = await secureX402.verifyPayment(proof);
    console.log('🔍 Payment verification result:', verification);
    
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        payment: secureX402.createPaymentRequest(),
      });
    }

    // Validate and sanitize beacon data
    const beaconData = {
      author: req.authenticatedUser.publicKey,
      content: req.body.content,
      topic: req.body.topic,
      treasury_transaction: proof.transaction,
      timestamp: Date.now(),
      author_display: req.body.author_display,
      platform_wallet: req.body.platform_wallet
    };

    // Create beacon using secure database service
    const savedBeacon = await SecureDatabase.createBeacon(beaconData);
    console.log('✅ Beacon saved to database:', savedBeacon);

    // Broadcast new beacon via SSE
    try {
      const eventsModule = require('./events');
      if (eventsModule.broadcastNewBeacon) {
        eventsModule.broadcastNewBeacon(savedBeacon);
        console.log('📡 Beacon broadcasted via SSE');
      } else {
        console.log('⚠️ broadcastNewBeacon function not available');
      }
    } catch (error) {
      console.error('Failed to broadcast new beacon:', error);
      // Don't fail the request if SSE broadcast fails
    }

    return res.status(200).json({
      success: true,
      message: 'Beacon created successfully',
      beacon: savedBeacon,
      payment: {
        transaction: proof.transaction,
        amount: verification.amount,
      },
    });

  } catch (error) {
    console.error('❌ Secure beacon API error:', error);
    return sendSecureError(res, 500, 'Failed to process beacon request', error);
  }
}
