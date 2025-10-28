import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';

// Solana connection (same as existing)
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

/**
 * Send tip with x402 payment
 * @param recipientAddress - The wallet address to tip
 * @param amount - Amount in SOL to tip
 * @param message - Optional tip message
 * @param beaconId - ID of the beacon being tipped
 * @param wallet - Solana wallet
 * @returns Promise with the response
 */
export async function sendTipWithPayment(
  recipientAddress: string,
  amount: number,
  message: string,
  beaconId: number,
  wallet: any
): Promise<any> {
  try {
    const payload = {
      recipient: recipientAddress,
      amount,
      message,
      beaconId,
      tipper: wallet.publicKey.toString(),
      tipper_display: wallet.publicKey.toString().slice(0, 8) + '...',
    };

    console.log('💰 Sending tip with x402 payment...', payload);

    // Use environment-aware API endpoint
    const apiEndpoint = '/api/tip';
    
    return await payForX402TipAndRetry(apiEndpoint, payload, wallet, amount);
  } catch (error) {
    console.error('❌ Tip payment error:', error);
    throw error;
  }
}

/**
 * Pay for x402 tip and retry the request
 * @param endpoint - API endpoint to call
 * @param payload - Request payload
 * @param wallet - Solana wallet
 * @param amount - Tip amount in SOL
 * @returns Promise with the response
 */
async function payForX402TipAndRetry(
  endpoint: string,
  payload: any,
  wallet: any,
  amount: number
): Promise<any> {
  try {
    // Helper to post tip with optional x402 headers
    async function postTip(proofHeaders?: Record<string, string>) {
      const requestBody = JSON.stringify(payload);
      console.log('📤 Sending tip request body:', requestBody);
      console.log('📤 Request headers:', { 'Content-Type': 'application/json', ...(proofHeaders ?? {}) });
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(proofHeaders ?? {})
        },
        body: requestBody
      });
      return res;
    }

    // 1) Try without payment (will 402 the first time)
    console.log('🔄 First tip request attempt:', { endpoint, payload });
    let res = await postTip();
    
    if (res.status !== 402) {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Tip failed: ${res.status} ${errorData.message || res.statusText}`);
      }
      return await res.json();
    }

    // 2) Parse payment requirements
    const { payment } = await res.json();
    console.log('💰 Tip payment required:', payment);

    // Check if wallet is connected
    if (!wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // 3) Create + send the x402 payment tx for the tip amount with unique payment ID
    const paymentId = `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentTx = await createTipPaymentTransaction(wallet.publicKey, payload.recipient, amount, paymentId);
    const signedTx = await wallet.signTransaction(paymentTx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Tip payment transaction confirmed:', signature);

    // 4) Build proof from the confirmed tx
    const proof = createX402Proof(signature, amount);
    const proofHeaders = {
      'x-402-proof': JSON.stringify(proof),
    };

    // 5) Retry with the same body and the proof headers
    console.log('🔄 Retrying tip request with proof:', { endpoint, payload, proof });
    res = await postTip(proofHeaders);

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Tip retry failed: ${res.status} ${errorData.message || res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('❌ x402 tip payment error:', error);
    throw error;
  }
}

/**
 * Create tip payment transaction with X402 memo and treasury fee
 * @param fromPubkey - Sender's public key
 * @param toAddress - Recipient's address
 * @param amount - Total amount in SOL (will be split between recipient and treasury)
 * @param paymentId - Unique payment identifier for X402 verification
 * @returns Transaction object
 */
async function createTipPaymentTransaction(fromPubkey: PublicKey, toAddress: string, amount: number, paymentId?: string): Promise<Transaction> {
  // Calculate 5% treasury fee
  const treasuryFee = amount * 0.05;
  const recipientAmount = amount - treasuryFee;
  
  // Treasury address (same as beacon payments)
  const treasuryAddress = 'hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6';
  
  const recipientPubkey = new PublicKey(toAddress);
  const treasuryPubkey = new PublicKey(treasuryAddress);
  
  const recipientLamports = Math.floor(recipientAmount * LAMPORTS_PER_SOL);
  const treasuryLamports = Math.floor(treasuryFee * LAMPORTS_PER_SOL);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  // Create transfer instruction for recipient (95%)
  const recipientTransfer = SystemProgram.transfer({
    fromPubkey,
    toPubkey: recipientPubkey,
    lamports: recipientLamports,
  });

  // Create transfer instruction for treasury (5%)
  const treasuryTransfer = SystemProgram.transfer({
    fromPubkey,
    toPubkey: treasuryPubkey,
    lamports: treasuryLamports,
  });

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  });

  // Add both transfers
  transaction.add(recipientTransfer);
  transaction.add(treasuryTransfer);
  
  // Add X402 memo for on-chain verification
  if (paymentId) {
    const memoInstruction = createMemoInstruction(`x402:${paymentId}`, [fromPubkey]);
    transaction.add(memoInstruction);
  } else {
    // Generate a unique payment ID if not provided
    const uniqueId = `tip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoInstruction = createMemoInstruction(`x402:${uniqueId}`, [fromPubkey]);
    transaction.add(memoInstruction);
  }
  
  return transaction;
}

/**
 * Creates an x402 proof object for tips
 * @param transactionSignature - The Solana transaction signature
 * @param amount - The amount paid in SOL
 * @param network - The Solana network
 * @returns The x402 proof object
 */
function createX402Proof(transactionSignature: string, amount: number, network: string = 'solana') {
  return {
    transaction: transactionSignature,
    amount,
    network,
    timestamp: Date.now(),
  };
}
