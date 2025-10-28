const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

// Treasury address
const TREASURY_ADDRESS = 'EpPXQsvRBvxZ9LDLDCT3NyhEN8uhfQBqi2jFei8TLT7';
const BEACON_PRICE_SOL = 0.001;

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-402-proof');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, content, author, author_display, timestamp, treasury_transaction, platform_wallet } = req.body;

    // Validate required fields
    if (!content || !author) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'content and author are required',
      });
    }

    // CRITICAL: Verify X402 payment proof
    const x402Proof = req.headers['x-402-proof'];
    if (!x402Proof) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This beacon requires a SOL payment',
        payment: {
          network: 'solana',
          recipient: TREASURY_ADDRESS,
          price: { token: 'SOL', amount: BEACON_PRICE_SOL },
          config: { description: `Create beacon: ${BEACON_PRICE_SOL} SOL` },
        },
      });
    }

    // Parse and verify X402 proof
    let proof;
    try {
      proof = JSON.parse(x402Proof);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid Proof',
        message: 'x-402-proof header must be valid JSON',
      });
    }

    // Verify payment transaction
    const paymentVerification = await verifyX402Payment(proof, connection, TREASURY_ADDRESS, BEACON_PRICE_SOL);
    if (!paymentVerification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: paymentVerification.error || 'Invalid payment proof',
        payment: {
          network: 'solana',
          recipient: TREASURY_ADDRESS,
          price: { token: 'SOL', amount: BEACON_PRICE_SOL },
          config: { description: `Create beacon: ${BEACON_PRICE_SOL} SOL` },
        },
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

    // Save beacon to database
    const beaconData = {
      topic: topic || 'general',
      content,
      author,
      author_display: author_display || author.slice(0, 8) + '...',
      timestamp: timestamp || Date.now(),
      treasury_transaction: treasury_transaction,
      platform_wallet: platform_wallet || false,
    };

    console.log('💾 Saving beacon to database:', beaconData);

    const { data: savedBeacon, error: dbError } = await supabase
      .from('beacons')
      .insert([beaconData])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database save error:', dbError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to save beacon to database',
      });
    }

    console.log('✅ Beacon saved to database:', savedBeacon);

    return res.status(200).json({
      success: true,
      message: 'Beacon saved successfully',
      beacon: savedBeacon,
    });

  } catch (error) {
    console.error('❌ Save beacon API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save beacon',
    });
  }
};

/**
 * Verify X402 payment for beacon creation
 * @param proof - X402 proof object
 * @param connection - Solana connection
 * @param expectedRecipient - Expected recipient address
 * @param expectedAmount - Expected amount in SOL
 * @returns Verification result
 */
async function verifyX402Payment(proof, connection, expectedRecipient, expectedAmount) {
  try {
    // Verify transaction exists and is confirmed
    const signature = proof.transaction;
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    // Calculate expected amount
    const expectedAmountLamports = Math.floor(expectedAmount * LAMPORTS_PER_SOL);
    
    // Check if transaction contains the expected transfer to treasury
    let paymentFound = false;
    let actualAmount = 0;

    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const accounts = transaction.transaction.message.accountKeys;
      const treasuryPubkey = new PublicKey(expectedRecipient);
      
      // Check treasury payment (where the SOL should go)
      const treasuryIndex = accounts.findIndex(key => key.equals(treasuryPubkey));
      if (treasuryIndex !== -1) {
        const preBalance = transaction.meta.preBalances[treasuryIndex];
        const postBalance = transaction.meta.postBalances[treasuryIndex];
        actualAmount = postBalance - preBalance;
        
        if (actualAmount >= expectedAmountLamports) {
          paymentFound = true;
        }
      }
    }

    if (!paymentFound) {
      return { 
        valid: false, 
        error: `Payment verification failed. Expected: ${expectedAmountLamports} lamports, Got: ${actualAmount} lamports` 
      };
    }

    // Check for X402 memo
    const memoFound = transaction.transaction.message.instructions.some(instruction => {
      if (instruction.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2') {
        const memoData = Buffer.from(instruction.data, 'base64').toString();
        return memoData.startsWith('x402:');
      }
      return false;
    });

    if (!memoFound) {
      return { valid: false, error: 'X402 memo not found in transaction' };
    }

    return { valid: true };
  } catch (error) {
    console.error('X402 verification error:', error);
    return { valid: false, error: `Verification failed: ${error.message}` };
  }
}
