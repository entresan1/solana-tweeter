import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
import { createX402Proof } from './x402';

// Solana connection - Using QuickNode
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Jupiter API configuration - Using QuickNode with Metis integration
const JUPITER_API_URL = 'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/';

/**
 * Send Jupiter swap with automatic X402 payment
 * @param tokenMint - Target token mint address
 * @param solAmount - Amount of SOL to swap
 * @param wallet - Solana wallet
 * @returns Promise with swap response
 */
export async function sendJupiterSwapWithPayment(
  tokenMint: string,
  solAmount: number,
  wallet: any
): Promise<any> {
  try {
    const payload = {
      tokenMint,
      solAmount,
      userWallet: wallet.publicKey.toBase58()
    };

    const result = await payForX402JupiterSwapAndRetry(
      '/api/buy-ca-beacon',
      payload,
      wallet,
      solAmount
    );

    return result;
  } catch (error: any) {
    console.error('❌ X402 Jupiter swap error:', error);
    throw new Error(`Failed to send Jupiter swap: ${error.message}`);
  }
}

/**
 * Pay for X402 Jupiter swap and retry the request
 * @param endpoint - API endpoint to call
 * @param payload - Request payload
 * @param wallet - Solana wallet
 * @param amount - Amount in SOL
 * @returns Promise with the response
 */
async function payForX402JupiterSwapAndRetry(
  endpoint: string,
  payload: any,
  wallet: any,
  amount: number
): Promise<any> {
  try {
    // Helper to post with optional x402 headers
    async function postRequest(proofHeaders?: Record<string, string>) {
      const requestBody = JSON.stringify(payload);
      console.log('📤 Sending Jupiter swap request:', requestBody);
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
    console.log('🔄 First Jupiter swap request attempt:', { endpoint, payload });
    let res = await postRequest();
    
    if (res.status !== 402) {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Jupiter swap request failed: ${res.status} ${errorData.message || res.statusText}`);
      }
      return await res.json();
    }

    // 2) Parse payment requirements
    const { payment } = await res.json();
    console.log('💰 Payment required for Jupiter swap:', payment);

    // Check if wallet is connected
    if (!wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // 3) Create + send the x402 payment tx with unique payment ID
    const paymentId = `jupiter_swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentTx = await createJupiterSwapPaymentTransaction(wallet.publicKey, payment.recipient, amount, paymentId);
    const signedTx = await wallet.signTransaction(paymentTx);
    const signature = await connection.sendRawTransaction(signedTx.serialize());
    
    console.log('✅ X402 payment sent for Jupiter swap:', signature);

    // 4) Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ X402 payment confirmed for Jupiter swap');

    // 5) Create x402 proof
    const proof = createX402Proof(signature, amount, 'solana');
    console.log('🔐 X402 proof created for Jupiter swap:', proof);

    // 6) Retry with x402 proof
    console.log('🔄 Retrying Jupiter swap with X402 proof...');
    res = await postRequest({ 'x-402-proof': JSON.stringify(proof) });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Jupiter swap with X402 failed: ${res.status} ${errorData.message || res.statusText}`);
    }

    const result = await res.json();
    console.log('✅ Jupiter swap completed with X402:', result);
    return result;

  } catch (error: any) {
    console.error('❌ X402 Jupiter swap payment error:', error);
    throw error;
  }
}

/**
 * Create Jupiter swap payment transaction with X402 memo
 * @param fromPubkey - Sender's public key
 * @param toAddress - Recipient's address
 * @param amount - Amount in SOL
 * @param paymentId - Unique payment identifier for X402 verification
 * @returns Transaction object
 */
async function createJupiterSwapPaymentTransaction(fromPubkey: PublicKey, toAddress: string, amount: number, paymentId?: string): Promise<Transaction> {
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
    const uniqueId = `jupiter_swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoInstruction = createMemoInstruction(`x402:${uniqueId}`, [fromPubkey]);
    transaction.add(memoInstruction);
  }
  
  return transaction;
}

/**
 * Get Jupiter quote for SOL → Token swap
 * @param tokenMint - Target token mint address
 * @param solAmount - Amount of SOL to swap
 * @returns Promise with quote information
 */
export async function getJupiterQuote(
  tokenMint: string,
  solAmount: number
): Promise<any> {
  const inputMint = 'So11111111111111111111111111111111111111112'; // SOL mint
  const amount = Math.floor(solAmount * 1e9); // Convert SOL to lamports
  const slippageBps = 50; // 0.5% slippage tolerance

  try {
    // Use Metis Jupiter API through QuickNode
    const url = `${JUPITER_API_URL}jupiter/v6/quote?inputMint=${inputMint}&outputMint=${tokenMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    console.log('🔄 Fetching Jupiter quote from QuickNode:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const quote = await response.json();

    if (!response.ok) {
      console.error('❌ QuickNode Jupiter API error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: quote
      });
      throw new Error(quote.error?.message || quote.error || `Failed to get quote: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Jupiter quote received from QuickNode:', {
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct
    });

    return {
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      route: quote.routePlan?.length || 0,
      success: true
    };
  } catch (error: any) {
    console.error('❌ QuickNode Jupiter API error:', error);
    
    return {
      success: false,
      error: `QuickNode Jupiter API failed: ${error.message}`
    };
  }
}
