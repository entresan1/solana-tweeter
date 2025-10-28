import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
import { createX402Proof } from './x402';

// Solana connection - Using QuickNode
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Jupiter API configuration - Using standard Jupiter API
// Use our proxy endpoints to avoid CORS issues
const JUPITER_QUOTE_URL = '/api/jupiter-proxy';
const JUPITER_SWAP_URL = '/api/jupiter-swap-proxy';

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
    console.log('🚀 Starting REAL Jupiter swap for CA token:', { tokenMint, solAmount });
    
    // 1. First, create the actual Jupiter swap transaction
    let swapTransaction;
    let swapSignature;
    
    try {
      swapTransaction = await createJupiterSwapTransaction(
        wallet.publicKey,
        tokenMint,
        solAmount
      );
      
      console.log('✅ Jupiter swap transaction created');
      
      // 2. Sign and send the swap transaction
      const signedSwapTx = await wallet.signTransaction(swapTransaction);
      swapSignature = await connection.sendRawTransaction(signedSwapTx.serialize());
      
      console.log('🔄 Jupiter swap transaction sent:', swapSignature);
      
      // 3. Wait for swap confirmation
      await connection.confirmTransaction(swapSignature, 'confirmed');
      console.log('✅ Jupiter swap confirmed - user now has CA tokens!');
      
    } catch (jupiterError: any) {
      console.error('❌ Jupiter swap failed:', jupiterError);
      
      // If Jupiter fails, show a helpful error message
      throw new Error(`Jupiter swap failed: ${jupiterError.message}. Please try again or contact support if the issue persists.`);
    }
    
    // 4. Now send X402 payment for the service
    const payload = {
      tokenMint,
      solAmount,
      userWallet: wallet.publicKey.toBase58(),
      swapSignature // Include swap signature as proof
    };

    const result = await payForX402JupiterSwapAndRetry(
      '/api/buy-ca-beacon',
      payload,
      wallet,
      solAmount
    );

    return {
      ...result,
      swapSignature,
      message: `Successfully swapped ${solAmount} SOL for ${tokenMint} CA token!`
    };
  } catch (error: any) {
    console.error('❌ Jupiter swap error:', error);
    throw new Error(`Failed to swap SOL for CA token: ${error.message}`);
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
    const proof = createX402Proof(signature, amount);
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
    // Use our proxy endpoint to avoid CORS issues
    const url = `${JUPITER_QUOTE_URL}?inputMint=${inputMint}&outputMint=${tokenMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    console.log('🔄 Fetching Jupiter quote from proxy:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const quote = await response.json();

    if (!response.ok) {
      console.error('❌ Jupiter proxy error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: quote
      });
      throw new Error(quote.error?.message || quote.error || `Failed to get quote: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Jupiter quote received via proxy:', {
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
    console.error('❌ Jupiter proxy error:', error);
    
    // Handle network errors specifically
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
      return {
        success: false,
        error: `Network error: Unable to connect to Jupiter API. Please check your internet connection and try again.`
      };
    }
    
    return {
      success: false,
      error: `Jupiter API failed: ${error.message}`
    };
  }
}

/**
 * Create actual Jupiter swap transaction for SOL → Token
 * @param fromPubkey - User's wallet public key
 * @param tokenMint - Target token mint address
 * @param solAmount - Amount of SOL to swap
 * @returns Promise with swap transaction
 */
async function createJupiterSwapTransaction(
  fromPubkey: PublicKey,
  tokenMint: string,
  solAmount: number
): Promise<Transaction> {
  try {
    console.log('🔄 Creating REAL Jupiter swap transaction:', {
      from: fromPubkey.toBase58(),
      tokenMint,
      solAmount
    });

    // Get quote for SOL → Token swap
    const quote = await getJupiterQuote(tokenMint, solAmount);
    
    if (!quote.success) {
      throw new Error(quote.error || 'Failed to get quote');
    }

    console.log('📊 Jupiter quote received:', {
      inputAmount: quote.inputAmount,
      outputAmount: quote.outputAmount,
      priceImpact: quote.priceImpact,
      route: quote.route
    });

    // Get swap transaction from Jupiter API via proxy
    const inputMint = 'So11111111111111111111111111111111111111112'; // SOL mint
    const amount = Math.floor(solAmount * 1e9); // Convert SOL to lamports
    const slippageBps = 50; // 0.5% slippage tolerance

    const swapUrl = JUPITER_SWAP_URL;
    
    const swapRequest = {
      quoteResponse: {
        inputMint,
        inAmount: quote.inputAmount.toString(),
        outputMint: tokenMint,
        outAmount: quote.outputAmount.toString(),
        otherAmountThreshold: quote.outputAmount.toString(),
        swapMode: 'ExactIn',
        slippageBps,
        platformFee: null,
        priceImpactPct: quote.priceImpact.toString()
      },
      userPublicKey: fromPubkey.toBase58(),
      wrapAndUnwrapSol: true,
      useSharedAccounts: true,
      feeAccount: null,
      trackingAccount: null,
      computeUnitPriceMicroLamports: null,
      asLegacyTransaction: false
    };

    console.log('🔄 Requesting swap transaction from Jupiter proxy...');
    
    const swapResponse = await fetch(swapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(swapRequest)
    });

    const swapData = await swapResponse.json();

    if (!swapResponse.ok) {
      throw new Error(swapData.error?.message || swapData.error || 'Failed to create swap transaction');
    }

    console.log('✅ Jupiter swap transaction received via proxy');

    // Deserialize the transaction
    const { Transaction } = await import('@solana/web3.js');
    const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));

    console.log('✅ REAL Jupiter swap transaction created - user will get CA tokens!');
    return transaction;
  } catch (error: any) {
    console.error('❌ Jupiter swap transaction creation error:', error);
    throw new Error(`Failed to create Jupiter swap transaction: ${error.message}`);
  }
}
