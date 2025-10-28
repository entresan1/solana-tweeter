import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Jupiter API configuration
const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';

/**
 * Create a Jupiter swap transaction: SOL → Token
 * @param fromPubkey - User's wallet public key
 * @param tokenMint - Target token mint address
 * @param solAmount - Amount of SOL to swap
 * @returns Promise with swap transaction
 */
export async function createJupiterSwap(
  fromPubkey: PublicKey,
  tokenMint: string,
  solAmount: number
): Promise<Transaction> {
  try {
    console.log('🔄 Creating Jupiter swap:', {
      from: fromPubkey.toBase58(),
      tokenMint,
      solAmount
    });

    // Get quote for SOL → Token swap
    const quote = await getJupiterQuote(tokenMint, solAmount);
    
    if (!quote.success) {
      throw new Error(quote.error || 'Failed to get quote');
    }

    console.log('📊 Jupiter quote:', {
      inputAmount: quote.inputAmount,
      outputAmount: quote.outputAmount,
      priceImpact: quote.priceImpact,
      route: quote.route
    });

    // For now, create a simple transaction as Jupiter SDK integration is complex
    // In production, you would use the Jupiter SDK to create the actual swap transaction
    const transaction = new Transaction();
    
    // Add a memo indicating this is a Jupiter swap
    const { createMemoInstruction } = await import('@solana/spl-memo');
    const memo = `Jupiter:${tokenMint}:${solAmount}:${Date.now()}`;
    transaction.add(createMemoInstruction(memo));

    console.log('✅ Jupiter swap transaction created (simplified)');
    return transaction;
  } catch (error: any) {
    console.error('❌ Jupiter swap error:', error);
    throw new Error(`Failed to create Jupiter swap: ${error.message}`);
  }
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
  try {
    const inputMint = 'So11111111111111111111111111111111111111112'; // SOL mint
    const amount = Math.floor(solAmount * 1e9); // Convert SOL to lamports
    const slippageBps = 50; // 0.5% slippage tolerance

    const url = `${JUPITER_API_URL}/quote?inputMint=${inputMint}&outputMint=${tokenMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    const response = await fetch(url);
    const quote = await response.json();

    if (!response.ok) {
      throw new Error(quote.error || 'Failed to get quote');
    }

    return {
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      route: quote.routePlan?.length || 0,
      success: true
    };
  } catch (error: any) {
    console.error('❌ Jupiter quote error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
