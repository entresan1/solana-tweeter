const treasuryService = require('./treasury-service');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-402-proof, idempotency-key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Request body:', req.body);

    // Check for x402 proof in headers
    const x402Proof = req.headers['x-402-proof'];

    if (!x402Proof) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires a 0.001 SOL payment',
        payment: treasuryService.createX402PaymentRequest(),
      });
    }

    // Parse proof
    let proof;
    try {
      proof = JSON.parse(x402Proof);
    } catch {
      return res.status(400).json({
        error: 'Invalid Proof',
        message: 'x-402-proof header must be valid JSON',
      });
    }

    // Verify payment using secure service
    console.log('🔍 Verifying payment proof:', proof);
    const verification = await treasuryService.verifyX402Payment(proof, treasuryService.connection);
    console.log('🔍 Payment verification result:', verification);
    
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        payment: treasuryService.createX402PaymentRequest(),
      });
    }

    // If we reach here, payment was verified successfully
    const { topic, content, author, author_display } = req.body;

    // Server-side validation
    const validation = treasuryService.validateBeaconData({ topic, content, author, author_display });
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Failed',
        message: validation.errors.join(', '),
      });
    }

    // Prepare beacon data
    const beaconData = {
      topic: topic && topic.trim() ? topic.trim() : 'general',
      content: content.trim(),
      author,
      author_display: author_display || author.slice(0, 8) + '...',
      timestamp: Date.now(),
      treasury_transaction: proof.transaction,
      platform_wallet: false, // Always false for direct payments
    };

    console.log('💾 Saving beacon to database:', beaconData);

    // Save beacon using secure service
    const savedBeacon = await treasuryService.saveBeacon(beaconData);

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
        amount: proof.amount || treasuryService.X402_CONFIG.priceSOL,
      },
    });

  } catch (error) {
    console.error('❌ Beacon API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process beacon request',
    });
  }
};
