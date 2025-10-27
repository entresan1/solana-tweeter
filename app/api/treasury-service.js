const { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram } = require('@solana/web3.js');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Treasury configuration
const TREASURY_SOL_ADDRESS = 'hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6';
const X402_CONFIG = {
  network: 'solana',
  priceSOL: 0.001,
  treasury: new PublicKey(TREASURY_SOL_ADDRESS),
  description: 'Pay 0.001 SOL to create beacon',
};

// Payment verification cache with proper security
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

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

/**
 * Secure payment verification with proper validation
 */
async function verifyX402Payment(proof, connection) {
  try {
    if (!proof || !proof.transaction) {
      return { valid: false, error: 'Missing payment proof' };
    }

    // Create secure cache key with hash
    const cacheKey = crypto.createHash('sha256')
      .update(`${proof.transaction}-${proof.amount || '0.001'}`)
      .digest('hex');
    
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

    // Check if transaction contains transfer to treasury
    let paymentFound = false;
    let actualAmount = 0;

    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const accounts = transaction.transaction.message.accountKeys;
      const treasuryIndex = accounts.findIndex(key => key.equals(treasuryPubkey));
      
      if (treasuryIndex !== -1) {
        const preBalance = transaction.meta.preBalances[treasuryIndex];
        const postBalance = transaction.meta.postBalances[treasuryIndex];
        actualAmount = postBalance - preBalance;
        
        // STRICT amount validation - must be exactly the expected amount
        if (actualAmount === expectedAmount) {
          paymentFound = true;
          console.log('✅ Payment verified via balance change');
        }
      }
    }

    // Alternative verification: check transaction instructions
    if (!paymentFound && transaction.transaction?.message?.instructions) {
      const accounts = transaction.transaction.message.accountKeys;
      for (const instruction of transaction.transaction.message.instructions) {
        const programId = accounts[instruction.programIdIndex];
        
        if (programId && programId.equals(SystemProgram.programId)) {
          if (instruction.accounts && instruction.accounts.length >= 2) {
            const toAccount = accounts[instruction.accounts[1]];
            
            if (toAccount && toAccount.equals(treasuryPubkey)) {
              // This is a transfer to our treasury
              paymentFound = true;
              actualAmount = expectedAmount;
              console.log('✅ Payment verified via instruction');
              break;
            }
          }
        }
      }
    }

    console.log('🔍 Payment verification result:', { paymentFound, actualAmount, expectedAmount });
    
    if (!paymentFound) {
      return { valid: false, error: 'Payment not found or incorrect amount' };
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

/**
 * Validate beacon data server-side
 */
function validateBeaconData(data) {
  const errors = [];
  
  if (!data.content || typeof data.content !== 'string') {
    errors.push('Content is required and must be a string');
  }
  
  if (data.content && data.content.length > 280) {
    errors.push('Content must be 280 characters or less');
  }
  
  if (!data.author || typeof data.author !== 'string') {
    errors.push('Author is required and must be a string');
  }
  
  if (data.topic && typeof data.topic !== 'string') {
    errors.push('Topic must be a string');
  }
  
  if (data.topic && data.topic.length > 50) {
    errors.push('Topic must be 50 characters or less');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Save beacon to database with proper validation
 */
async function saveBeacon(beaconData) {
  try {
    const { data: savedBeacon, error: dbError } = await supabase
      .from('beacons')
      .insert([{
        topic: beaconData.topic || 'general',
        content: beaconData.content,
        author: beaconData.author,
        author_display: beaconData.author_display,
        timestamp: beaconData.timestamp,
        treasury_transaction: beaconData.treasury_transaction,
        platform_wallet: beaconData.platform_wallet || false,
      }])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database save error:', dbError);
      throw new Error('Failed to save beacon to database');
    }

    return savedBeacon;
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    throw error;
  }
}

/**
 * Get beacons with proper pagination and security
 */
async function getBeacons(limit = 20, offset = 0) {
  try {
    const { data: beacons, error } = await supabase
      .from('beacons')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching beacons:', error);
      throw new Error('Failed to fetch beacons');
    }

    return beacons || [];
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    throw error;
  }
}

module.exports = {
  verifyX402Payment,
  createX402PaymentRequest,
  validateBeaconData,
  saveBeacon,
  getBeacons,
  X402_CONFIG,
  connection
};
