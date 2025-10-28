import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Jupiter } from '@jup-ag/api';

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Jupiter API instance
const jupiter = new Jupiter({
  connection,
  cluster: 'mainnet-beta'
});

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
    const quote = await jupiter.getQuote({
      inputMint: 'So11111111111111111111111111111111111111112', // SOL mint
      outputMint: tokenMint,
      amount: Math.floor(solAmount * 1e9), // Convert SOL to lamports
      slippageBps: 50 // 0.5% slippage tolerance
    });

    console.log('📊 Jupiter quote:', {
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      route: quote.routePlan?.length || 0
    });

    // Create swap transaction
    const swapTransaction = await jupiter.exchange({
      quote
    });

    console.log('✅ Jupiter swap transaction created');
    return swapTransaction;
  } catch (error) {
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
    const quote = await jupiter.getQuote({
      inputMint: 'So11111111111111111111111111111111111111112', // SOL mint
      outputMint: tokenMint,
      amount: Math.floor(solAmount * 1e9), // Convert SOL to lamports
      slippageBps: 50 // 0.5% slippage tolerance
    });

    return {
      inputAmount: quote.inAmount,
      outputAmount: quote.outAmount,
      priceImpact: quote.priceImpactPct,
      route: quote.routePlan?.length || 0,
      success: true
    };
  } catch (error) {
    console.error('❌ Jupiter quote error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
