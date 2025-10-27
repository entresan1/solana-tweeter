import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createX402Proof, X402_CONFIG } from './x402';

// Solana connection (same as existing)
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

/**
 * Pay for x402 and retry the request
 * @param endpoint - API endpoint to call
 * @param payload - Request payload
 * @param wallet - Solana wallet
 * @returns Promise with the response
 */
export async function payForX402AndRetry(
  endpoint: string,
  payload: any,
  wallet: any
): Promise<any> {
  try {
    // First attempt - might get 402
    const firstResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // If not 402, return the response
    if (firstResponse.status !== 402) {
      return await firstResponse.json();
    }

    // Parse 402 response to get payment details
    const paymentRequest = await firstResponse.json();
    console.log('💰 Payment required:', paymentRequest);

    // Check if wallet is connected
    if (!wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Create payment transaction
    const paymentTx = await createPaymentTransaction(wallet.publicKey);
    
    // Sign and send transaction
    const signedTx = await wallet.signTransaction(paymentTx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Payment transaction confirmed:', signature);

    // Create x402 proof
    const proof = createX402Proof(signature, X402_CONFIG.priceSOL);

    // Retry request with proof
    const retryResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-402-proof': JSON.stringify(proof),
      },
      body: JSON.stringify(payload),
    });

    if (!retryResponse.ok) {
      const errorData = await retryResponse.json();
      throw new Error(`Request failed: ${errorData.message || retryResponse.statusText}`);
    }

    return await retryResponse.json();
  } catch (error) {
    console.error('❌ x402 payment error:', error);
    throw error;
  }
}

/**
 * Create payment transaction to treasury
 * @param fromPubkey - Sender's public key
 * @returns Transaction object
 */
async function createPaymentTransaction(fromPubkey: PublicKey): Promise<Transaction> {
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  
  // Create transfer instruction
  const transferInstruction = SystemProgram.transfer({
    fromPubkey,
    toPubkey: X402_CONFIG.treasury,
    lamports: X402_CONFIG.priceSOL * LAMPORTS_PER_SOL,
  });

  // Create transaction
  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  });

  transaction.add(transferInstruction);
  return transaction;
}

/**
 * Send beacon with automatic x402 payment
 * @param topic - Beacon topic
 * @param content - Beacon content
 * @param wallet - Solana wallet
 * @returns Promise with beacon response
 */
export async function sendBeaconWithPayment(
  topic: string,
  content: string,
  wallet: any
): Promise<any> {
  const payload = {
    topic,
    content,
    author: wallet.publicKey.toString(),
    author_display: wallet.publicKey.toString().slice(0, 8) + '...',
  };

    // Use environment-aware API endpoint
    const apiEndpoint = '/api/beacon';
    
    return await payForX402AndRetry(apiEndpoint, payload, wallet);
}

/**
 * Check if x402 payment is required for an endpoint
 * @param endpoint - API endpoint to check
 * @returns Promise<boolean> - Whether payment is required
 */
export async function checkPaymentRequired(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    return response.status === 402;
  } catch {
    return false;
  }
}
