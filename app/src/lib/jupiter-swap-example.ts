// Example of how to use the X402 Jupiter swap client
import { sendJupiterSwapWithPayment, getJupiterQuote } from './x402-jupiter-client';

/**
 * Example: Swap SOL for a CA token using X402
 * This makes it much easier for users - they just call one function!
 */
export async function exampleJupiterSwap(wallet: any) {
  try {
    const tokenMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC example
    const solAmount = 0.1; // 0.1 SOL
    
    console.log('🚀 Starting X402 Jupiter swap...');
    
    // Get quote first (optional)
    const quote = await getJupiterQuote(tokenMint, solAmount);
    if (quote.success) {
      console.log('📊 Quote received:', {
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        priceImpact: quote.priceImpact
      });
    }
    
    // Send the swap with automatic X402 payment
    const result = await sendJupiterSwapWithPayment(
      tokenMint,
      solAmount,
      wallet
    );
    
    console.log('✅ Jupiter swap completed with X402:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Jupiter swap failed:', error);
    throw error;
  }
}

/**
 * How to use in a Vue component:
 * 
 * const handleSwap = async () => {
 *   try {
 *     const result = await exampleJupiterSwap(wallet.value);
 *     console.log('Swap successful:', result);
 *   } catch (error) {
 *     console.error('Swap failed:', error);
 *   }
 * };
 */
