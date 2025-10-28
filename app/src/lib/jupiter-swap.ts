import { Connection, PublicKey, Transaction } from '@solana/web3.js';

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Jupiter API configuration - Using QuickNode with Metis integration
const JUPITER_API_URL = 'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/';

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

    // Get swap transaction from Jupiter API
    const inputMint = 'So11111111111111111111111111111111111111112'; // SOL mint
    const amount = Math.floor(solAmount * 1e9); // Convert SOL to lamports
    const slippageBps = 50; // 0.5% slippage tolerance

    const swapUrl = `${JUPITER_API_URL}jupiter/v6/swap`;
    
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

    console.log('🔄 Requesting swap transaction from Jupiter...');
    
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

    console.log('✅ Jupiter swap transaction received');

    // Deserialize the transaction
    const { Transaction } = await import('@solana/web3.js');
    const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));

    console.log('✅ Jupiter swap transaction created');
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

    // Use Metis Jupiter API through QuickNode
    const url = `${JUPITER_API_URL}jupiter/v6/quote?inputMint=${inputMint}&outputMint=${tokenMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    console.log('🔄 Fetching Jupiter quote from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const quote = await response.json();

    if (!response.ok) {
      console.error('❌ Jupiter API error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        error: quote
      });
      throw new Error(quote.error?.message || quote.error || `Failed to get quote: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Jupiter quote received:', {
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
    console.error('❌ Jupiter quote error:', error);
    
    // Fallback to standard Jupiter API
    try {
      console.log('🔄 Trying standard Jupiter API as fallback...');
      const fallbackUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${tokenMint}&amount=${amount}&slippageBps=${slippageBps}`;
      
      const fallbackResponse = await fetch(fallbackUrl);
      const fallbackQuote = await fallbackResponse.json();
      
      if (fallbackResponse.ok) {
        console.log('✅ Fallback Jupiter quote received');
        return {
          inputAmount: fallbackQuote.inAmount,
          outputAmount: fallbackQuote.outAmount,
          priceImpact: fallbackQuote.priceImpactPct,
          route: fallbackQuote.routePlan?.length || 0,
          success: true
        };
      }
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}
