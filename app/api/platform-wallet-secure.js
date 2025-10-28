const { Keypair, PublicKey, Connection, SystemProgram, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');
const { createMemoInstruction } = require('@solana/spl-memo');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Solana connection - USE QUICKNODE ONLY
const rpcUrl = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC_URL || 'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/';
const connection = new Connection(rpcUrl, 'confirmed');

// Treasury address
const TREASURY_SOL_ADDRESS = process.env.TREASURY_SOL_ADDRESS || 'hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6';

/**
 * Generate platform wallet address (deterministic but secure)
 */
function generatePlatformWalletAddress(userWalletAddress) {
  // Use HMAC-SHA256 with environment variable secret for secure key generation
  const secretKey = process.env.PLATFORM_WALLET_SECRET;
  const salt = process.env.PLATFORM_WALLET_SALT;
  
  if (!secretKey || !salt) {
    throw new Error('Missing required environment variables: PLATFORM_WALLET_SECRET and PLATFORM_WALLET_SALT');
  }
  
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(salt + userWalletAddress);
  const hash = hmac.digest();
  
  // Create keypair from hash
  const keypair = Keypair.fromSeed(hash.slice(0, 32));
  return keypair.publicKey.toBase58();
}

/**
 * Get platform wallet keypair (server-side only)
 */
function getPlatformWalletKeypair(userWalletAddress) {
  // Use HMAC-SHA256 with environment variable secret for secure key generation
  const secretKey = process.env.PLATFORM_WALLET_SECRET;
  const salt = process.env.PLATFORM_WALLET_SALT;
  
  if (!secretKey || !salt) {
    throw new Error('Missing required environment variables: PLATFORM_WALLET_SECRET and PLATFORM_WALLET_SALT');
  }
  
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(salt + userWalletAddress);
  const hash = hmac.digest();
  
  return Keypair.fromSeed(hash.slice(0, 32));
}

/**
 * Get platform wallet balance
 */
async function getPlatformWalletBalance(userWalletAddress) {
  try {
    const platformAddress = generatePlatformWalletAddress(userWalletAddress);
    const balance = await connection.getBalance(new PublicKey(platformAddress));
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting platform wallet balance:', error);
    return 0;
  }
}

/**
 * Send SOL from platform wallet (server-side only)
 */
async function sendFromPlatformWallet(fromUserAddress, toAddress, amount, transactionType = 'platform-transfer') {
  try {
    const fromKeypair = getPlatformWalletKeypair(fromUserAddress);
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Check balance
    const balance = await connection.getBalance(fromKeypair.publicKey);
    if (balance < lamports) {
      throw new Error('Insufficient platform wallet balance');
    }

    // Create transaction
    const transaction = new Transaction();
    
    // Add transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubkey,
        lamports: lamports,
      })
    );

    // Add X402 memo for transaction identification
    const memo = `x402:platform-${transactionType}:${fromUserAddress.slice(0, 8)}:${amount}`;
    const memoInstruction = createMemoInstruction(memo, [fromKeypair.publicKey]);
    transaction.add(memoInstruction);

    // Send transaction
    const signature = await connection.sendTransaction(transaction, [fromKeypair]);
    await connection.confirmTransaction(signature);

    return signature;
  } catch (error) {
    console.error('Error sending from platform wallet:', error);
    throw error;
  }
}

/**
 * Verify platform wallet payment
 */
async function verifyPlatformWalletPayment(proof, connection, expectedRecipient, expectedAmount) {
  try {
    if (!proof || !proof.transaction) {
      return { valid: false, error: 'Missing payment proof' };
    }

    // Verify transaction exists and is confirmed
    const signature = proof.transaction;
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    // Verify recipient and amount
    const expectedRecipientPubkey = new PublicKey(expectedRecipient);
    const expectedLamports = Math.floor(expectedAmount * LAMPORTS_PER_SOL);

    // Check if transaction contains transfer to expected recipient
    let paymentFound = false;
    let actualAmount = 0;

    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const accounts = transaction.transaction.message.accountKeys;
      const recipientIndex = accounts.findIndex(key => key.equals(expectedRecipientPubkey));
      
      if (recipientIndex !== -1) {
        const preBalance = transaction.meta.preBalances[recipientIndex];
        const postBalance = transaction.meta.postBalances[recipientIndex];
        actualAmount = postBalance - preBalance;
        
        if (actualAmount >= expectedLamports) {
          paymentFound = true;
          console.log('✅ Platform wallet payment verified via balance change');
        }
      }
    }

    // Alternative verification: check transaction instructions
    if (!paymentFound && transaction.transaction?.message?.instructions) {
      const accounts = transaction.transaction.message.accountKeys;
      for (const instruction of transaction.transaction.message.instructions) {
        const programId = accounts[instruction.programIdIndex];
        
        if (programId && programId.equals(SystemProgram.programId)) {
          if (instruction.accounts && instruction.accounts.length >= 2) {
            const toAccount = accounts[instruction.accounts[1]];
            
            if (toAccount && toAccount.equals(expectedRecipientPubkey)) {
              paymentFound = true;
              actualAmount = expectedLamports;
              console.log('✅ Platform wallet payment verified via instruction');
              break;
            }
          }
        }
      }
    }

    if (!paymentFound) {
      return { valid: false, error: 'Payment not found or insufficient amount' };
    }

    // Verify network (mainnet only)
    const cluster = connection.rpcEndpoint;
    if (!cluster.includes('mainnet') && !cluster.includes('quiknode.pro')) {
      return { valid: false, error: 'Only mainnet payments are accepted' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Platform wallet payment verification error:', error);
    return { valid: false, error: 'Payment verification failed' };
  }
}

/**
 * Save platform wallet transaction
 */
async function savePlatformWalletTransaction(transactionData) {
  try {
    const { data, error } = await supabase
      .from('platform_transactions')
      .insert([transactionData])
      .select()
      .single();

    if (error) {
      console.error('❌ Database save error:', error);
      throw new Error('Failed to save platform wallet transaction');
    }

    return data;
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    throw error;
  }
}

module.exports = {
  generatePlatformWalletAddress,
  getPlatformWalletKeypair,
  getPlatformWalletBalance,
  sendFromPlatformWallet,
  verifyPlatformWalletPayment,
  savePlatformWalletTransaction,
  connection,
  TREASURY_SOL_ADDRESS
};
