import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createMemoInstruction } from '@solana/spl-memo';
import { platformWalletService } from './platform-wallet';

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

/**
 * Deposit SOL to platform wallet using x402
 * @param wallet - User's Phantom wallet
 * @param platformWalletAddress - Platform wallet address to deposit to
 * @param amount - Amount in SOL to deposit
 * @returns Promise with the response
 */
export async function depositToPlatformWallet(
  wallet: any,
  platformWalletAddress: string,
  amount: number
): Promise<any> {
  try {
    const payload = {
      recipient: platformWalletAddress,
      amount,
      type: 'deposit',
      user: wallet.publicKey.toString(),
    };

    console.log('💰 Depositing to platform wallet...', payload);

    // Use environment-aware API endpoint
    const apiEndpoint = '/api/platform-deposit';
    
    return await payForX402AndRetry(apiEndpoint, payload, wallet, amount);
  } catch (error) {
    console.error('❌ Platform deposit error:', error);
    throw error;
  }
}

/**
 * Send beacon using platform wallet (no Phantom approval needed)
 * @param topic - Beacon topic
 * @param content - Beacon content
 * @param userWalletAddress - User's wallet address
 * @returns Promise with the response
 */
export async function sendBeaconWithPlatformWallet(
  topic: string,
  content: string,
  userWalletAddress: string
): Promise<any> {
  try {
    // Check if platform wallet has sufficient balance for beacon creation (0.001 SOL)
    const hasBalance = await platformWalletService.hasSufficientBalance(userWalletAddress, 0.001);
    
    if (!hasBalance) {
      return {
        success: false,
        message: 'Insufficient platform wallet balance. Please deposit more SOL.',
        requiresDeposit: true
      };
    }

    // Send beacon payment directly from platform wallet
    const result = await platformWalletService.sendFromPlatformWallet(
      userWalletAddress,
      'EpPXQsvRBvxZ9LDLDCT3NyhEN8uhfQBqi2jFei8TLT7', // Treasury address
      0.001, // Beacon creation fee
      'beacon-creation'
    );

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to send beacon from platform wallet'
      };
    }

    // Generate unique beacon ID
    const uniqueBeaconId = `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save beacon to database
    const beaconData = {
      id: uniqueBeaconId,
      topic: topic || 'general',
      content,
      author: userWalletAddress,
      author_display: userWalletAddress.slice(0, 8) + '...',
      timestamp: Date.now(),
      treasury_transaction: result.signature,
      platform_wallet: true
    };

    // Create X402 proof for the platform wallet payment
    const proof = {
      transaction: result.signature,
      amount: 0.001,
      nonce: crypto.getRandomValues(new Uint8Array(16)).join(''),
      timestamp: Date.now()
    };

    // Save to database with X402 proof
    const response = await fetch('/api/save-beacon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-402-proof': JSON.stringify(proof)
      },
      body: JSON.stringify(beaconData)
    });

    const saveResult = await response.json();

    if (saveResult.success) {
      return {
        success: true,
        message: 'Beacon created successfully from platform wallet!',
        beacon: {
          id: uniqueBeaconId,
          ...saveResult.beacon
        },
        payment: {
          transaction: result.signature,
          amount: 0.001,
          platform_wallet: true
        }
      };
    } else {
      return {
        success: false,
        message: 'Beacon sent but failed to save to database'
      };
    }
  } catch (error) {
    console.error('❌ Platform beacon error:', error);
    throw error;
  }
}

/**
 * Send tip using platform wallet (no Phantom approval needed)
 * @param recipientAddress - The wallet address to tip
 * @param amount - Amount in SOL to tip
 * @param message - Optional tip message
 * @param beaconId - ID of the beacon being tipped
 * @param userWalletAddress - User's wallet address
 * @returns Promise with the response
 */
export async function sendTipWithPlatformWallet(
  recipientAddress: string,
  amount: number,
  message: string,
  beaconId: number,
  userWalletAddress: string
): Promise<any> {
  try {
    // Check if platform wallet has sufficient balance
    const hasBalance = await platformWalletService.hasSufficientBalance(userWalletAddress, amount);
    
    if (!hasBalance) {
      return {
        success: false,
        message: 'Insufficient platform wallet balance. Please deposit more SOL.',
        requiresDeposit: true
      };
    }

    // Send tip directly from platform wallet
    const result = await platformWalletService.sendFromPlatformWallet(
      userWalletAddress,
      recipientAddress,
      amount,
      'tip-payment'
    );

    if (!result.success) {
      return {
        success: false,
        message: result.error || 'Failed to send tip from platform wallet'
      };
    }

    // Save tip to database
    const tipData = {
      recipient: recipientAddress,
      amount,
      message,
      beaconId,
      tipper: userWalletAddress,
      tipper_display: userWalletAddress.slice(0, 8) + '...',
      treasury_transaction: result.signature,
      platform_wallet: true
    };

    // Save to database
    const response = await fetch('/api/save-tip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tipData)
    });

    const saveResult = await response.json();

    if (saveResult.success) {
      return {
        success: true,
        message: 'Tip sent successfully from platform wallet!',
        payment: {
          transaction: result.signature,
          amount: amount,
          platform_wallet: true
        }
      };
    } else {
      return {
        success: false,
        message: 'Tip sent but failed to save to database'
      };
    }
  } catch (error) {
    console.error('❌ Platform tip error:', error);
    throw error;
  }
}

/**
 * Pay for x402 and retry the request (for deposits)
 * @param endpoint - API endpoint to call
 * @param payload - Request payload
 * @param wallet - Solana wallet
 * @param amount - Amount in SOL
 * @returns Promise with the response
 */
async function payForX402AndRetry(
  endpoint: string,
  payload: any,
  wallet: any,
  amount: number
): Promise<any> {
  try {
    // Helper to post with optional x402 headers
    async function postRequest(proofHeaders?: Record<string, string>) {
      const requestBody = JSON.stringify(payload);
      console.log('📤 Sending request body:', requestBody);
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
    console.log('🔄 First request attempt:', { endpoint, payload });
    let res = await postRequest();
    
    if (res.status !== 402) {
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Request failed: ${res.status} ${errorData.message || res.statusText}`);
      }
      return await res.json();
    }

    // 2) Parse payment requirements
    const { payment } = await res.json();
    console.log('💰 Payment required:', payment);

    // Check if wallet is connected
    if (!wallet?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // 3) Create + send the x402 payment tx with unique payment ID
    const paymentId = `x402_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentTx = await createPaymentTransaction(wallet.publicKey, payment.recipient, amount, paymentId);
    const signedTx = await wallet.signTransaction(paymentTx);
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    console.log('✅ Payment transaction confirmed:', signature);

    // 4) Build proof from the confirmed tx
    const proof = createX402Proof(signature, amount);
    const proofHeaders = {
      'x-402-proof': JSON.stringify(proof),
    };

    // 5) Retry with the same body and the proof headers
    console.log('🔄 Retrying request with proof:', { endpoint, payload, proof });
    res = await postRequest(proofHeaders);

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Request retry failed: ${res.status} ${errorData.message || res.statusText}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error('❌ x402 payment error:', error);
    throw error;
  }
}

/**
 * Create payment transaction with X402 memo
 * @param fromPubkey - Sender's public key
 * @param toAddress - Recipient's address
 * @param amount - Amount in SOL
 * @param paymentId - Unique payment identifier for X402 verification
 * @returns Transaction object
 */
async function createPaymentTransaction(fromPubkey: PublicKey, toAddress: string, amount: number, paymentId?: string): Promise<Transaction> {
  const toPubkey = new PublicKey(toAddress);
  const lamports = amount * LAMPORTS_PER_SOL;

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
    const uniqueId = `beacon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const memoInstruction = createMemoInstruction(`x402:${uniqueId}`, [fromPubkey]);
    transaction.add(memoInstruction);
  }
  
  return transaction;
}

/**
 * Creates an x402 proof object
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
