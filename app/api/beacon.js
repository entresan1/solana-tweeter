const { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram } = require('@solana/web3.js');

// Treasury address for beacon payments
const TREASURY_SOL_ADDRESS = 'hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6';

// x402 Configuration
const X402_CONFIG = {
  network: 'solana',
  priceSOL: 0.01,
  treasury: new PublicKey(TREASURY_SOL_ADDRESS),
  description: 'Pay 0.01 SOL to beacon (tweet).',
};

// Payment verification cache (in-memory for serverless)
const paymentCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of paymentCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      paymentCache.delete(key);
    }
  }
}, 60000);

/**
 * Verify x402 payment proof
 */
async function verifyX402Payment(proof, connection) {
  try {
    if (!proof || !proof.transaction) {
      return { valid: false, error: 'Missing payment proof' };
    }

    const cacheKey = `${proof.transaction}-${proof.amount || '0.01'}`;
    
    // Check cache first
    const cached = paymentCache.get(cacheKey);
    if (cached && cached.verified) {
      return { valid: true };
    }

    // Verify transaction exists and is confirmed
    const signature = proof.transaction;
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    // Verify transaction is to our treasury
    const treasuryPubkey = X402_CONFIG.treasury;
    const expectedAmount = X402_CONFIG.priceSOL * LAMPORTS_PER_SOL;

    console.log('🔍 Verifying payment to treasury:', treasuryPubkey.toBase58());
    console.log('🔍 Expected amount:', expectedAmount, 'lamports');

    // Check if transaction contains transfer to treasury
    let paymentFound = false;
    let actualAmount = 0;

    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const accounts = transaction.transaction.message.accountKeys;
      const treasuryIndex = accounts.findIndex(key => key.equals(treasuryPubkey));
      
      console.log('🔍 Treasury account index:', treasuryIndex);
      
      if (treasuryIndex !== -1) {
        const preBalance = transaction.meta.preBalances[treasuryIndex];
        const postBalance = transaction.meta.postBalances[treasuryIndex];
        actualAmount = postBalance - preBalance;
        
        console.log('🔍 Balance change:', actualAmount, 'lamports');
        
        if (actualAmount >= expectedAmount) {
          paymentFound = true;
          console.log('✅ Payment found via balance change');
        }
      }
    }

    // Alternative verification: check transaction instructions
    if (!paymentFound && transaction.transaction?.message?.instructions) {
      console.log('🔍 Checking transaction instructions...');
      const accounts = transaction.transaction.message.accountKeys;
      for (const instruction of transaction.transaction.message.instructions) {
        // Get the program ID from the accounts array
        const programId = accounts[instruction.programIdIndex];
        console.log('🔍 Instruction program ID:', programId?.toBase58());
        
        if (programId && programId.equals(SystemProgram.programId)) {
          console.log('🔍 Found system program instruction');
          // This is a system program instruction, check if it's a transfer
          if (instruction.accounts && instruction.accounts.length >= 2) {
            const toAccount = accounts[instruction.accounts[1]];
            console.log('🔍 Transfer to account:', toAccount?.toBase58());
            
            if (toAccount && toAccount.equals(treasuryPubkey)) {
              // This is a transfer to our treasury
              paymentFound = true;
              actualAmount = expectedAmount;
              console.log('✅ Payment found via instruction verification');
              break;
            }
          }
        }
      }
    }

    console.log('🔍 Payment verification result:', { paymentFound, actualAmount, expectedAmount });
    
    if (!paymentFound) {
      return { valid: false, error: 'Payment not found or insufficient amount' };
    }

    // Verify network (mainnet only)
    const cluster = connection.rpcEndpoint;
    if (!cluster.includes('mainnet') && !cluster.includes('quiknode.pro')) {
      return { valid: false, error: 'Only mainnet payments are accepted' };
    }

    // Cache successful verification
    paymentCache.set(cacheKey, { timestamp: Date.now(), verified: true });

    return { valid: true };
  } catch (error) {
    console.error('x402 payment verification error:', error);
    return { valid: false, error: 'Payment verification failed' };
  }
}

/**
 * Create x402 payment request response
 */
function createX402PaymentRequest(amount = X402_CONFIG.priceSOL, description = X402_CONFIG.description) {
  return {
    network: X402_CONFIG.network,
    recipient: X402_CONFIG.treasury.toBase58(),
    price: { token: 'SOL', amount },
    config: { description },
  };
}

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
    // Initialize Solana connection
    const connection = new Connection(
      'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
      'confirmed'
    );

    // Check for x402 proof in headers
    const x402Proof = req.headers['x-402-proof'];

    if (!x402Proof) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires a 0.01 SOL payment',
        payment: createX402PaymentRequest(),
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

    // Verify payment
    console.log('🔍 Verifying payment proof:', proof);
    const verification = await verifyX402Payment(proof, connection);
    console.log('🔍 Payment verification result:', verification);
    
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        payment: createX402PaymentRequest(),
      });
    }

    // If we reach here, payment was verified successfully
    const { topic, content, author, author_display } = req.body;

    // Validate required fields
    if (!topic || !content || !author) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'topic, content, and author are required',
      });
    }

    // For now, return success without database integration
    // In production, you would integrate with your Supabase database here
    const beaconData = {
      topic,
      content,
      author,
      author_display: author_display || author.slice(0, 8) + '...',
      timestamp: Date.now(),
      treasury_transaction: proof.transaction,
    };

    console.log('✅ Beacon created with x402 payment:', beaconData);

    return res.status(200).json({
      success: true,
      message: 'Beacon created successfully',
      beacon: beaconData,
      payment: {
        transaction: proof.transaction,
        amount: proof.amount || X402_CONFIG.priceSOL,
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
