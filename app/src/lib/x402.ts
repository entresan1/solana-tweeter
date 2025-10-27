import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { beaconService } from './supabase';

// Treasury address for beacon payments (from existing send-tweet.ts)
export const TREASURY_SOL_ADDRESS = 'hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6';

// x402 Configuration
export const X402_CONFIG = {
  network: 'solana',
  priceSOL: 0.01, // 0.01 SOL as required
  treasury: new PublicKey(TREASURY_SOL_ADDRESS),
  description: 'Pay 0.01 SOL to beacon (tweet).',
} as const;

// Payment verification cache to prevent replay attacks
const paymentCache = new Map<string, { timestamp: number; verified: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of paymentCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      paymentCache.delete(key);
    }
  }
}, 60000); // Clean every minute

/**
 * Verify x402 payment proof
 * @param proof - The x402 proof object
 * @param connection - Solana connection
 * @returns Promise<boolean> - Whether payment is valid
 */
export async function verifyX402Payment(
  proof: any,
  connection: Connection
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check if proof exists
    if (!proof || !proof.transaction) {
      return { valid: false, error: 'Missing payment proof' };
    }

    // Create cache key from proof
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
      maxSupportedTransactionVersion: 0,
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
      // Find the treasury account in the transaction
      const accounts = transaction.transaction.message.accountKeys;
      const treasuryIndex = accounts.findIndex(key => key.equals(treasuryPubkey));
      
      if (treasuryIndex !== -1) {
        const preBalance = transaction.meta.preBalances[treasuryIndex];
        const postBalance = transaction.meta.postBalances[treasuryIndex];
        actualAmount = postBalance - preBalance;
        
        if (actualAmount >= expectedAmount) {
          paymentFound = true;
        }
      }
    }

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
 * @param amount - Amount in SOL
 * @param description - Payment description
 * @returns x402 payment request object
 */
export function createX402PaymentRequest(amount: number = X402_CONFIG.priceSOL, description: string = X402_CONFIG.description) {
  return {
    network: X402_CONFIG.network,
    recipient: X402_CONFIG.treasury.toBase58(),
    price: { token: 'SOL', amount },
    config: { description },
    // Add facilitator URL if available
    facilitatorUrl: process.env.X402_FACILITATOR_URL || undefined,
  };
}

/**
 * Middleware to check x402 payment
 * @param connection - Solana connection
 * @returns Express middleware function
 */
export function createX402Middleware(connection: Connection) {
  return async (req: any, res: any, next: any) => {
    try {
      // Check for x402 proof in headers
      const x402Proof = req.headers['x-402-proof'];
      const idempotencyKey = req.headers['idempotency-key'];

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
      const verification = await verifyX402Payment(proof, connection);
      if (!verification.valid) {
        return res.status(402).json({
          error: 'Payment Verification Failed',
          message: verification.error || 'Invalid payment proof',
          payment: createX402PaymentRequest(),
        });
      }

      // Add payment info to request for use in handler
      req.x402Payment = {
        transaction: proof.transaction,
        amount: proof.amount || X402_CONFIG.priceSOL,
        verified: true,
      };

      next();
    } catch (error) {
      console.error('x402 middleware error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Payment verification failed',
      });
    }
  };
}

/**
 * Client-side helper to create payment proof
 * @param transactionSignature - Solana transaction signature
 * @param amount - Amount paid in SOL
 * @returns x402 proof object
 */
export function createX402Proof(transactionSignature: string, amount: number = X402_CONFIG.priceSOL) {
  return {
    transaction: transactionSignature,
    amount,
    network: X402_CONFIG.network,
    timestamp: Date.now(),
  };
}
