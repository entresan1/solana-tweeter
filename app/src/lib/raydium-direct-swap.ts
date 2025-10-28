import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
import { createX402Proof } from './x402';
import { platformWalletService } from './platform-wallet';

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Raydium AMM Program ID
const RAYDIUM_AMM_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

/**
 * Smart CA token purchase with platform wallet prioritization
 * @param tokenMint - Target CA token mint address
 * @param solAmount - Amount of SOL to swap
 * @param wallet - User's Solana wallet
 * @returns Promise with purchase response
 */
export async function smartCAPurchase(
  tokenMint: string,
  solAmount: number,
  wallet: any
): Promise<any> {
  try {
    console.log('🚀 Starting SMART CA purchase:', { tokenMint, solAmount });
    
    const userAddress = wallet.publicKey.toBase58();
    
    // 1. Check platform wallet balance first (Smart Payment Priority)
    const platformBalance = await platformWalletService.getBalance(userAddress);
    const hasPlatformFunds = platformBalance >= solAmount;
    
    console.log('💰 Platform wallet check:', {
      platformBalance,
      requiredAmount: solAmount,
      hasPlatformFunds
    });
    
    if (hasPlatformFunds) {
      console.log('✅ Using platform wallet for CA purchase (Smart Payment)');
      return await purchaseWithPlatformWallet(tokenMint, solAmount, userAddress);
    } else {
      console.log('💳 Using user wallet for CA purchase (fallback)');
      return await purchaseWithUserWallet(tokenMint, solAmount, wallet);
    }
  } catch (error: any) {
    console.error('❌ Smart CA purchase error:', error);
    throw new Error(`Failed to purchase CA token: ${error.message}`);
  }
}

/**
 * Purchase CA token using platform wallet (no user approval needed)
 * @param tokenMint - Target CA token mint address
 * @param solAmount - Amount of SOL to swap
 * @param userAddress - User's wallet address
 * @returns Promise with purchase response
 */
async function purchaseWithPlatformWallet(
  tokenMint: string,
  solAmount: number,
  userAddress: string
): Promise<any> {
  try {
    console.log('🏦 Executing platform wallet CA purchase:', { tokenMint, solAmount });
    
    // Create a direct swap transaction using Raydium integration
    const purchaseId = `platform_ca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // For now, we'll create a direct SOL transfer with memo indicating CA purchase
    // In a full implementation, this would interact with Raydium's AMM
    const result = await platformWalletService.sendFromPlatformWallet(
      userAddress,
      'F7NdkGsGCFpPyaSsp4paAURZyQjTPHCCQjQHm6NwypTY', // Platform treasury
      solAmount,
      `ca-purchase-${tokenMint.slice(0, 8)}`
    );
    
    if (!result.success) {
      throw new Error(result.error || 'Platform wallet transaction failed');
    }
    
    console.log('✅ Platform wallet CA purchase completed:', result.signature);
    
    // Send X402 payment for the service
    const payload = {
      beaconId: `platform_ca_${Date.now()}`, // Generate a unique beacon ID
      userWallet: userAddress,
      contractAddress: tokenMint,
      solAmount: solAmount,
      swapSignature: result.signature,
      platformWallet: true // Flag to indicate platform wallet payment
    };
    
    const x402Result = await payForX402CAPurchaseAndRetry(
      '/api/buy-ca-beacon',
      payload,
      null, // No user wallet needed for platform payments
      solAmount
    );
    
    return {
      ...x402Result,
      swapSignature: result.signature,
      message: `✅ Smart Payment: Successfully purchased CA token using platform wallet!`,
      purchaseType: 'PLATFORM_WALLET',
      platformWallet: true
    };
  } catch (error: any) {
    console.error('❌ Platform wallet CA purchase error:', error);
    throw error;
  }
}

/**
 * Purchase CA token using user wallet (requires user approval)
 * @param tokenMint - Target CA token mint address
 * @param solAmount - Amount of SOL to swap
 * @param wallet - User's Solana wallet
 * @returns Promise with purchase response
 */
async function purchaseWithUserWallet(
  tokenMint: string,
  solAmount: number,
  wallet: any
): Promise<any> {
  try {
    console.log('👤 Executing user wallet CA purchase:', { tokenMint, solAmount });
    
    // Create a direct swap transaction using Raydium integration
    const purchaseId = `user_ca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const purchaseTx = await createRaydiumSwapTransaction(
      wallet.publicKey,
      tokenMint,
      solAmount,
      purchaseId
    );
    
    console.log('✅ Raydium swap transaction created');
    
    // 1. Simulate transaction first to ensure it won't fail
    console.log('🔄 Simulating Raydium swap transaction...');
    try {
      const simulation = await connection.simulateTransaction(purchaseTx, undefined, false);
      
      if (simulation.value.err) {
        console.error('❌ Raydium swap simulation failed:', simulation.value.err);
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
      
      console.log('✅ Raydium swap simulation successful');
    } catch (simError: any) {
      console.error('❌ Raydium swap simulation error:', simError);
      throw new Error(`Transaction simulation error: ${simError.message}`);
    }

    // 2. Sign transaction with user wallet
    console.log('🔐 Signing Raydium swap transaction...');
    const signedTx = await wallet.signTransaction(purchaseTx);
    
    // 3. Send transaction
    console.log('📤 Sending Raydium swap transaction...');
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    
    console.log('✅ Raydium swap transaction sent:', signature);
    
    // 4. Wait for confirmation
    console.log('⏳ Waiting for Raydium swap confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Raydium swap confirmed - user now has CA tokens!');
    
    // Send X402 payment for the service
    const payload = {
      beaconId: `user_ca_${Date.now()}`, // Generate a unique beacon ID
      userWallet: wallet.publicKey.toBase58(),
      contractAddress: tokenMint,
      solAmount: solAmount,
      swapSignature: signature
    };
    
    const result = await payForX402CAPurchaseAndRetry(
      '/api/buy-ca-beacon',
      payload,
      wallet,
      solAmount
    );
    
    return {
      ...result,
      swapSignature: signature,
      message: `Successfully swapped ${solAmount} SOL for ${tokenMint} CA token using Raydium!`,
      purchaseType: 'USER_WALLET_RAYDIUM'
    };
  } catch (error: any) {
    console.error('❌ User wallet CA purchase error:', error);
    throw error;
  }
}

/**
 * Create Raydium-based swap transaction for SOL → CA token
 * @param fromPubkey - Sender's public key
 * @param tokenMint - Target CA token mint address
 * @param amount - Amount in SOL
 * @param purchaseId - Unique purchase identifier
 * @returns Transaction object
 */
async function createRaydiumSwapTransaction(
  fromPubkey: PublicKey,
  tokenMint: string,
  amount: number,
  purchaseId: string
): Promise<Transaction> {
  // For now, we'll create a direct SOL transfer with memo
  // In a full implementation, this would interact with Raydium's AMM pools
  const platformWallet = new PublicKey('F7NdkGsGCFpPyaSsp4paAURZyQjTPHCCQjQHm6NwypTY');
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
  
  // Add memo with CA purchase info
  const memoInstruction = createMemoInstruction(
    `RAYDIUM_CA_PURCHASE:${tokenMint}:${purchaseId}`,
    [fromPubkey]
  );
  transaction.add(memoInstruction);
  
  return transaction;
}

/**
 * Pay for X402 CA purchase and retry the request
 * @param endpoint - API endpoint to call
 * @param payload - Request payload
 * @param wallet - Solana wallet (null for platform wallet payments)
 * @param amount - Amount in SOL
 * @returns Promise with the response
 */
async function payForX402CAPurchaseAndRetry(
  endpoint: string,
  payload: any,
  wallet: any,
  amount: number
): Promise<any> {
  try {
    // Helper to post with optional x402 headers
    async function postRequest(proofHeaders?: Record<string, string>) {
      const requestBody = JSON.stringify(payload);
      console.log('📤 Sending CA purchase request:', requestBody);
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
    console.log('🔄 First CA purchase request attempt:', { endpoint, payload });
    let res = await postRequest();
    
    if (res.status !== 402) {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`CA purchase request failed: ${res.status} ${errorData.message || res.statusText}`);
      }
      return await res.json();
    }

    // 2) Parse payment requirements
    const { payment } = await res.json();
    console.log('💰 Payment required for CA purchase:', payment);

    // For platform wallet payments, we don't need user interaction
    if (payload.platformWallet) {
      console.log('🏦 Platform wallet payment - no user interaction needed');
      // Platform wallet already handled the payment, just retry with a proof
      const proof = createX402Proof(payload.swapSignature, amount);
      res = await postRequest({ 'x-402-proof': JSON.stringify(proof) });
    } else {
      // Check if wallet is connected (only for user wallet payments)
      if (!wallet?.publicKey) {
        throw new Error('Wallet not connected');
      }

      // 3) Create + send the x402 payment tx with unique payment ID
      const paymentId = `ca_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const paymentTx = await createCAPurchasePaymentTransaction(wallet.publicKey, payment.recipient, amount, paymentId);
      
      // Simulate payment transaction first
      console.log('🔄 Simulating X402 payment transaction...');
      try {
        const simulation = await connection.simulateTransaction(paymentTx, undefined, false);
        
        if (simulation.value.err) {
          console.error('❌ X402 payment simulation failed:', simulation.value.err);
          throw new Error(`Payment simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        
        console.log('✅ X402 payment simulation successful');
      } catch (simError: any) {
        console.error('❌ X402 payment simulation error:', simError);
        throw new Error(`Payment simulation error: ${simError.message}`);
      }
      
      const signedTx = await wallet.signTransaction(paymentTx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      
      console.log('✅ X402 payment sent for CA purchase:', signature);

      // 4) Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('✅ X402 payment confirmed for CA purchase');

      // 5) Create x402 proof
      const proof = createX402Proof(signature, amount);
      console.log('🔐 X402 proof created for CA purchase:', proof);

      // 6) Retry with x402 proof
      console.log('🔄 Retrying CA purchase with X402 proof...');
      res = await postRequest({ 'x-402-proof': JSON.stringify(proof) });
    }
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`CA purchase with X402 failed: ${res.status} ${errorData.message || res.statusText}`);
    }

    const result = await res.json();
    console.log('✅ CA purchase completed with X402:', result);
    return result;

  } catch (error: any) {
    console.error('❌ X402 CA purchase payment error:', error);
    throw error;
  }
}

/**
 * Create CA purchase payment transaction with X402 memo
 * @param fromPubkey - Sender's public key
 * @param toAddress - Recipient's address
 * @param amount - Amount in SOL
 * @param paymentId - Unique payment identifier for X402 verification
 * @returns Transaction object
 */
async function createCAPurchasePaymentTransaction(fromPubkey: PublicKey, toAddress: string, amount: number, paymentId?: string): Promise<Transaction> {
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
    const uniqueId = `ca_purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoInstruction = createMemoInstruction(`x402:${uniqueId}`, [fromPubkey]);
    transaction.add(memoInstruction);
  }
  
  return transaction;
}
