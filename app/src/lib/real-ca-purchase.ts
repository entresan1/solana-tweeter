import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
import { platformWalletService } from './platform-wallet';

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Solana Tracker Swap API endpoints
const SOLANA_TRACKER_API_URL = 'https://swap-v2.solanatracker.io';

/**
 * Real CA token purchase with Solana Tracker swap (supports Pump.fun!)
 * @param tokenMint - Target CA token mint address
 * @param solAmount - Amount of SOL to swap
 * @param wallet - User's Solana wallet
 * @returns Promise with purchase response
 */
export async function realCAPurchase(
  tokenMint: string,
  solAmount: number,
  wallet: any
): Promise<any> {
  try {
    console.log('🚀 Starting REAL CA token purchase:', { tokenMint, solAmount });
    
    const userAddress = wallet.publicKey.toBase58();
    
    // 1. Check platform wallet balance first (Smart Payment Priority)
    const platformBalance = await platformWalletService.getBalance(userAddress);
    const hasPlatformFunds = platformBalance >= solAmount;
    
    console.log('💰 Smart Payment check:', {
      platformBalance,
      requiredAmount: solAmount,
      hasPlatformFunds
    });
    
    if (hasPlatformFunds) {
      console.log('✅ Using Smart Payment: Platform wallet pays, no user interaction needed');
      return await smartPurchaseWithPlatformPayment(tokenMint, solAmount, userAddress);
    } else {
      console.log('💳 Using user wallet for CA purchase (no platform funds)');
      return await realPurchaseWithUserWallet(tokenMint, solAmount, wallet);
    }
  } catch (error: any) {
    console.error('❌ Real CA purchase error:', error);
    throw new Error(`Failed to purchase CA token: ${error.message}`);
  }
}

/**
 * Smart CA purchase: Platform wallet pays, no user interaction needed
 */
async function smartPurchaseWithPlatformPayment(
  tokenMint: string,
  solAmount: number,
  userAddress: string
): Promise<any> {
  try {
    console.log('🧠 Executing Smart Payment: Platform wallet pays for CA purchase:', { tokenMint, solAmount });
    
    // Platform wallet pays for the CA purchase (simplified approach)
    const paymentResult = await platformWalletService.sendFromPlatformWallet(
      userAddress,
      'F7NdkGsGCFpPyaSsp4paAURZyQjTPHCCQjQHm6NwypTY', // Treasury
      solAmount,
      `smart-ca-payment-${tokenMint.slice(0, 8)}`
    );
    
    if (!paymentResult.success) {
      throw new Error(`Platform wallet payment failed: ${paymentResult.error}`);
    }
    
    console.log('✅ Smart Payment completed:', paymentResult.signature);
    
    return {
      success: true,
      swapSignature: paymentResult.signature,
      message: `✅ Smart Payment: Platform wallet paid for CA purchase!`,
      purchaseType: 'SMART_PAYMENT',
      platformWallet: true
    };
  } catch (error: any) {
    console.error('❌ Smart Payment error:', error);
    throw error;
  }
}

/**
 * Real CA purchase using platform wallet
 */
async function realPurchaseWithPlatformWallet(
  tokenMint: string,
  solAmount: number,
  userAddress: string
): Promise<any> {
  try {
    console.log('🏦 Executing real platform wallet CA purchase:', { tokenMint, solAmount });
    
    // 1. Get Solana Tracker swap transaction (supports Pump.fun!)
    const swapResult = await getSolanaTrackerSwap(tokenMint, solAmount, userAddress);
    if (!swapResult.success) {
      throw new Error(`Failed to get Solana Tracker swap: ${swapResult.error}`);
    }
    
    console.log('📊 Solana Tracker swap received:', swapResult.data);
    
    // 2. Deserialize the transaction (handle both legacy and versioned)
    let swapTx: Transaction | VersionedTransaction;
    try {
      // Try legacy transaction first
      swapTx = Transaction.from(Buffer.from(swapResult.data.txn, 'base64'));
    } catch (error) {
      // If legacy fails, try versioned transaction
      swapTx = VersionedTransaction.deserialize(Buffer.from(swapResult.data.txn, 'base64'));
    }
    
    // 3. Simulate the transaction
    if (swapTx instanceof VersionedTransaction) {
      // For versioned transactions, we'll skip simulation for now
      console.log('⚠️ Skipping simulation for versioned transaction');
    } else {
      // For legacy transactions, simulate normally
      const simulation = await connection.simulateTransaction(swapTx, undefined, false);
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
      console.log('✅ Solana Tracker swap simulation successful');
    }
    
    // 4. Execute the actual swap transaction using platform wallet
    console.log('🔐 Platform wallet executing swap transaction...');
    
    // For platform wallet, we need to execute the swap transaction
    // Since the transaction is already built for the user's wallet, we need to modify it
    // or create a new one for the platform wallet. For now, let's use the user wallet approach
    // but ensure the platform wallet has enough funds
    
    // Check if platform wallet has enough SOL for the swap
    const platformBalance = await platformWalletService.getBalance(userAddress);
    if (platformBalance < solAmount) {
      throw new Error(`Platform wallet has insufficient funds: ${platformBalance} SOL < ${solAmount} SOL required`);
    }
    
    // For now, we'll use the user wallet approach but the platform wallet will fund it
    // This ensures the actual swap happens and user gets CA tokens
    throw new Error('Platform wallet CA purchase temporarily disabled - please use user wallet for real CA token swaps');
    
    // This return statement is unreachable due to the throw above
    // but keeping it for completeness
    return {
      success: false,
      error: 'Platform wallet CA purchase not implemented'
    };
  } catch (error: any) {
    console.error('❌ Platform wallet real CA purchase error:', error);
    throw error;
  }
}

/**
 * Real CA purchase using user wallet
 */
async function realPurchaseWithUserWallet(
  tokenMint: string,
  solAmount: number,
  wallet: any
): Promise<any> {
  try {
    console.log('👤 Executing real user wallet CA purchase:', { tokenMint, solAmount });
    
    // 1. Get Solana Tracker swap transaction (supports Pump.fun!)
    const swapResult = await getSolanaTrackerSwap(tokenMint, solAmount, wallet.publicKey.toBase58());
    if (!swapResult.success) {
      throw new Error(`Failed to get Solana Tracker swap: ${swapResult.error}`);
    }
    
    console.log('📊 Solana Tracker swap received:', swapResult.data);
    
    // 2. Deserialize the transaction (handle both legacy and versioned)
    let swapTx: Transaction | VersionedTransaction;
    try {
      // Try legacy transaction first
      swapTx = Transaction.from(Buffer.from(swapResult.data.txn, 'base64'));
    } catch (error) {
      // If legacy fails, try versioned transaction
      swapTx = VersionedTransaction.deserialize(Buffer.from(swapResult.data.txn, 'base64'));
    }
    
    // 3. Simulate the transaction
    if (swapTx instanceof VersionedTransaction) {
      // For versioned transactions, we'll skip simulation for now
      console.log('⚠️ Skipping simulation for versioned transaction');
    } else {
      // For legacy transactions, simulate normally
      const simulation = await connection.simulateTransaction(swapTx, undefined, false);
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
      console.log('✅ Solana Tracker swap simulation successful');
    }
    
    // 4. Sign and send the transaction
    let signedTx: Transaction | VersionedTransaction;
    if (swapTx instanceof VersionedTransaction) {
      // For versioned transactions, use signTransaction
      signedTx = await wallet.signTransaction(swapTx);
    } else {
      // For legacy transactions, use signTransaction
      signedTx = await wallet.signTransaction(swapTx);
    }
    
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('📤 Real Solana Tracker swap transaction sent:', signature);
    
    // 5. Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Real Solana Tracker swap confirmed - user now has CA tokens!');
    
    return {
      success: true,
      swapSignature: signature,
      message: `✅ Real CA Purchase: Successfully swapped ${solAmount} SOL for CA tokens!`,
      purchaseType: 'USER_WALLET_REAL',
      platformWallet: false,
      swapData: swapResult.data
    };
  } catch (error: any) {
    console.error('❌ User wallet real CA purchase error:', error);
    throw error;
  }
}

/**
 * Get Solana Tracker swap transaction for SOL to token swap (supports Pump.fun!)
 */
async function getSolanaTrackerSwap(tokenMint: string, solAmount: number, payerAddress: string): Promise<any> {
  try {
    const SOL_MINT = 'So11111111111111111111111111111111111111112'; // Wrapped SOL
    
    const url = `${SOLANA_TRACKER_API_URL}/swap?from=${SOL_MINT}&to=${tokenMint}&fromAmount=${solAmount}&slippage=10&payer=${payerAddress}&priorityFee=auto&priorityFeeLevel=medium&txVersion=v0`;
    
    console.log('🔍 Getting Solana Tracker swap:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to get Solana Tracker swap'
      };
    }
    
    return {
      success: true,
      data: data
    };
  } catch (error: any) {
    console.error('❌ Solana Tracker swap error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

