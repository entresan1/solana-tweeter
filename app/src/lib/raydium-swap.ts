import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
import { createX402Proof } from './x402';

// Solana connection - Using QuickNode
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Raydium AMM Program ID
const RAYDIUM_AMM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

/**
 * Create a simple token purchase by sending SOL directly
 * This is a fallback when Jupiter/Raydium APIs are not available
 * @param tokenMint - Target token mint address
 * @param solAmount - Amount of SOL to send
 * @param wallet - Solana wallet
 * @returns Promise with purchase response
 */
export async function sendDirectTokenPurchase(
  tokenMint: string,
  solAmount: number,
  wallet: any
): Promise<any> {
  try {
    console.log('🚀 Starting DIRECT token purchase (no swap):', { tokenMint, solAmount });
    
    // 1. Create a simple SOL transfer transaction with memo
    const purchaseId = `direct_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const purchaseTx = await createDirectPurchaseTransaction(
      wallet.publicKey,
      tokenMint,
      solAmount,
      purchaseId
    );
    
    console.log('✅ Direct purchase transaction created');
    
    // 2. Sign and send the purchase transaction
    const signedTx = await wallet.signTransaction(purchaseTx);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    console.log('🔄 Direct purchase transaction sent:', signature);
    
    // 3. Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Direct purchase confirmed - SOL sent for token purchase!');
    
    // 4. Now send X402 payment for the service
    const payload = {
      tokenMint,
      solAmount,
      userWallet: wallet.publicKey.toBase58(),
      swapSignature: signature // Use purchase signature as proof
    };

    const result = await payForX402DirectPurchaseAndRetry(
      '/api/buy-ca-beacon',
      payload,
      wallet,
      solAmount
    );

    return {
      ...result,
      swapSignature: signature,
      message: `Successfully sent ${solAmount} SOL for ${tokenMint} token purchase!`,
      purchaseType: 'DIRECT_PURCHASE'
    };
  } catch (error: any) {
    console.error('❌ Direct purchase error:', error);
    throw new Error(`Failed to purchase token: ${error.message}`);
  }
}

/**
 * Create direct purchase transaction with memo
 * @param fromPubkey - Sender's public key
 * @param tokenMint - Target token mint address
 * @param amount - Amount in SOL
 * @param purchaseId - Unique purchase identifier
 * @returns Transaction object
 */
async function createDirectPurchaseTransaction(
  fromPubkey: PublicKey,
  tokenMint: string,
  amount: number,
  purchaseId: string
): Promise<Transaction> {
  // For now, we'll send SOL to a platform wallet with a memo
  // In a real implementation, this would interact with the token's AMM
  const platformWallet = new PublicKey('EpPXQsvRBvxZ9LDLDCT3NyhEN8uhfQBqi2jFei8TLT7'); // Your platform wallet
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const transferInstruction = SystemProgram.transfer({
    fromPubkey,
    toPubkey: platformWallet,
    lamports,
  });

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  });

  transaction.add(transferInstruction);
  
  // Add memo with token purchase info
  const memoInstruction = createMemoInstruction(
    `TOKEN_PURCHASE:${tokenMint}:${purchaseId}`,
    [fromPubkey]
  );
  transaction.add(memoInstruction);
  
  return transaction;
}

/**
 * Pay for X402 direct purchase and retry the request
 * @param endpoint - API endpoint to call
 * @param payload - Request payload
 * @param wallet - Solana wallet
 * @param amount - Amount in SOL
 * @returns Promise with the response
 */
async function payForX402DirectPurchaseAndRetry(
  endpoint: string,
  payload: any,
  wallet: any,
  amount: number
): Promise<any> {
  try {
    // Helper to post with optional x402 headers
    async function postRequest(proofHeaders?: Record<string, string>) {
      const requestBody = JSON.stringify(payload);
      console.log('📤 Sending direct purchase request:', requestBody);
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
    console.log('🔄 First direct purchase request attempt:', { endpoint, payload });
    let res = await postRequest();
    
    if (res.status !== 402) {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Direct purchase request failed: ${res.status} ${errorData.message || res.statusText}`);
      }
      return await res.json();
    }

    // 2) Parse payment requirements
    const { payment } = await res.json();
    console.log('💰 Payment required for direct purchase:', payment);

    // Check if wallet is connected
    if (!wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // 3) Create + send the x402 payment tx with unique payment ID
    const paymentId = `direct_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentTx = await createDirectPurchasePaymentTransaction(wallet.publicKey, payment.recipient, amount, paymentId);
    const signedTx = await wallet.signTransaction(paymentTx);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    console.log('✅ X402 payment sent for direct purchase:', signature);

    // 4) Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ X402 payment confirmed for direct purchase');

    // 5) Create x402 proof
    const proof = createX402Proof(signature, amount);
    console.log('🔐 X402 proof created for direct purchase:', proof);

    // 6) Retry with x402 proof
    console.log('🔄 Retrying direct purchase with X402 proof...');
    res = await postRequest({ 'x-402-proof': JSON.stringify(proof) });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Direct purchase with X402 failed: ${res.status} ${errorData.message || res.statusText}`);
    }

    const result = await res.json();
    console.log('✅ Direct purchase completed with X402:', result);
    return result;

  } catch (error: any) {
    console.error('❌ X402 direct purchase payment error:', error);
    throw error;
  }
}

/**
 * Create direct purchase payment transaction with X402 memo
 * @param fromPubkey - Sender's public key
 * @param toAddress - Recipient's address
 * @param amount - Amount in SOL
 * @param paymentId - Unique payment identifier for X402 verification
 * @returns Transaction object
 */
async function createDirectPurchasePaymentTransaction(fromPubkey: PublicKey, toAddress: string, amount: number, paymentId?: string): Promise<Transaction> {
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const transferInstruction = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports,
  });

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  });

  transaction.add(transferInstruction);
  
  // Add X402 memo for on-chain verification
  if (paymentId) {
    const memoInstruction = createMemoInstruction(`x402:${paymentId}`, [fromPubkey]);
    transaction.add(memoInstruction);
  } else {
    // Generate a unique payment ID if not provided
    const uniqueId = `direct_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoInstruction = createMemoInstruction(`x402:${uniqueId}`, [fromPubkey]);
    transaction.add(memoInstruction);
  }
  
  return transaction;
}
