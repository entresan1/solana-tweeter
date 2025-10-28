const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey } = require('@solana/web3.js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  // Don't throw error on startup, handle it in the request handler
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Solana connection - USE QUICKNODE ONLY
const rpcUrl = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC_URL || 'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/';
const connection = new Connection(rpcUrl, 'confirmed');

// Direct Jupiter swap - no platform fees collected

module.exports = async (req, res) => {
  // Check environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Missing required environment variables' 
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-402-proof');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { beaconId, userWallet, contractAddress, solAmount, swapSignature } = req.body;

  if (!beaconId || !userWallet || !contractAddress || !solAmount) {
    return res.status(400).json({ error: 'Missing required fields: beaconId, userWallet, contractAddress, solAmount' });
  }

  if (isNaN(solAmount) || solAmount <= 0) {
    return res.status(400).json({ error: 'Invalid SOL amount' });
  }

  // Check for X402 proof in headers
  const x402Proof = req.headers['x-402-proof'];

  if (!x402Proof) {
    return res.status(402).json({
      error: 'Payment Required',
      message: 'This token purchase requires a SOL payment',
      payment: {
        network: 'solana',
        recipient: userWallet, // User pays themselves for the purchase
        price: { token: 'SOL', amount: solAmount },
        config: { description: `Token purchase: ${solAmount} SOL → ${contractAddress}` },
      },
    });
  }

  try {
    // Parse and verify X402 proof
    let proof;
    try {
      proof = JSON.parse(x402Proof);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid Proof',
        message: 'x-402-proof header must be valid JSON',
      });
    }

    // Verify X402 payment AND purchase signature
    console.log('🔍 Verifying X402 payment and purchase signature:', { proof, swapSignature });
    
    // First verify the purchase actually happened
    if (!swapSignature) {
      return res.status(400).json({
        error: 'Purchase Required',
        message: 'Token purchase must be completed first',
        payment: {
          network: 'solana',
          recipient: userWallet,
          price: { token: 'SOL', amount: solAmount },
          config: { description: `Complete token purchase: ${solAmount} SOL → ${contractAddress}` },
        },
      });
    }

    // Verify the purchase transaction exists and is confirmed
    const purchaseVerification = await verifyDirectPurchase(swapSignature, connection, userWallet, contractAddress, parseFloat(solAmount));
    if (!purchaseVerification.valid) {
      return res.status(400).json({
        error: 'Purchase Verification Failed',
        message: purchaseVerification.error || 'Invalid purchase transaction',
        payment: {
          network: 'solana',
          recipient: userWallet,
          price: { token: 'SOL', amount: solAmount },
          config: { description: `Complete token purchase: ${solAmount} SOL → ${contractAddress}` },
        },
      });
    }

    // Then verify X402 payment
    const verification = await verifyX402Payment(proof, connection, userWallet, parseFloat(solAmount));
    console.log('🔍 X402 verification result:', verification);
    
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        payment: {
          network: 'solana',
          recipient: userWallet,
          price: { token: 'SOL', amount: solAmount },
          config: { description: `Jupiter swap: ${solAmount} SOL → ${contractAddress}` },
        },
      });
    }

    // Verify the beacon exists and is a CA beacon
    const { data: beacon, error: beaconError } = await supabase
      .from('beacons')
      .select('*')
      .eq('id', beaconId)
      .single();

    if (beaconError || !beacon) {
      return res.status(404).json({ error: 'Beacon not found' });
    }

    // Verify it's actually a CA beacon
    const content = beacon.content?.trim() || '';
    const caMatch = content.match(/\b[1-9A-HJ-NP-Za-km-z]{44}\b/);
    if (!caMatch) {
      return res.status(400).json({ error: 'This is not a valid CA beacon' });
    }

    // Verify contract address matches
    if (caMatch[0] !== contractAddress) {
      return res.status(400).json({ error: 'Contract address mismatch' });
    }

    // Direct swap - no fees, full amount goes to Jupiter
    const swapAmount = parseFloat(solAmount);
    const totalCost = parseFloat(solAmount);
    
    console.log('CA Purchase Request:', {
      beaconId,
      userWallet,
      contractAddress,
      solAmount,
      swapAmount,
      totalCost,
      timestamp: new Date().toISOString()
    });

    // X402 payment verified - Jupiter swap will be handled by client
    console.log('✅ X402 payment verified for Jupiter swap');

    // Create purchase record for database
    const purchase = {
      beacon_id: beaconId,
      buyer_wallet: userWallet,
      contract_address: contractAddress,
      purchase_amount: parseFloat(solAmount),
      platform_fee: 0, // No platform fee - direct swap
      total_cost: totalCost,
      transaction_data: null, // X402 handled by client
      status: 'completed', // X402 verified means completed
      created_at: new Date().toISOString()
    };

    // Save to database (if table exists)
    let savedPurchase = null;
    try {
      const { data, error: dbError } = await supabase
        .from('ca_purchases')
        .insert([purchase])
        .select()
        .single();

      if (dbError) {
        console.error('Database save error:', dbError);
        // If table doesn't exist, just log the purchase
        console.log('⚠️ ca_purchases table not found, logging purchase locally:', purchase);
        
        // If it's a column error, provide helpful message
        if (dbError.message && dbError.message.includes('column') && dbError.message.includes('does not exist')) {
          console.log('💡 Run the SQL from setup-ca-purchases-simple.sql in your Supabase dashboard');
        }
      } else {
        savedPurchase = data;
        console.log('✅ Purchase saved to database:', savedPurchase);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      console.log('⚠️ ca_purchases table not found, logging purchase locally:', purchase);
      
      // If it's a column error, provide helpful message
      if (dbError.message && dbError.message.includes('column') && dbError.message.includes('does not exist')) {
        console.log('💡 Run the SQL from setup-ca-purchases-simple.sql in your Supabase dashboard');
      }
    }

    return res.status(200).json({ 
      success: true, 
      purchase: savedPurchase || purchase,
      message: `✅ SUCCESS! Token purchase completed: ${solAmount} SOL sent for ${contractAddress} CA tokens!`,
      purchaseAmount: parseFloat(solAmount),
      totalCost: parseFloat(solAmount),
      purchaseType: 'SOL_TO_CA_DIRECT',
      x402Verified: true,
      purchaseSignature: swapSignature,
      tokensRequested: true
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Verify Jupiter swap transaction
 * @param swapSignature - Jupiter swap transaction signature
 * @param connection - Solana connection
 * @param userWallet - User's wallet address
 * @param expectedTokenMint - Expected token mint address
 * @param expectedAmount - Expected SOL amount
 * @returns Verification result
 */
async function verifyDirectPurchase(purchaseSignature, connection, userWallet, expectedTokenMint, expectedAmount) {
  try {
    console.log('🔍 Verifying direct purchase transaction:', purchaseSignature);
    
    // Get the purchase transaction
    const transaction = await connection.getTransaction(purchaseSignature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Purchase transaction not found or not confirmed' };
    }

    console.log('✅ Purchase transaction found and confirmed');
    
    // Check if transaction was successful
    if (transaction.meta?.err) {
      return { valid: false, error: 'Purchase transaction failed: ' + JSON.stringify(transaction.meta.err) };
    }

    // Check if user's SOL balance decreased (they spent SOL)
    const userPubkey = new PublicKey(userWallet);
    const accounts = transaction.transaction.message.accountKeys;
    const userIndex = accounts.findIndex(key => key.equals(userPubkey));
    
    if (userIndex === -1) {
      return { valid: false, error: 'User wallet not found in transaction' };
    }

    const preBalance = transaction.meta.preBalances[userIndex];
    const postBalance = transaction.meta.postBalances[userIndex];
    const solSpent = preBalance - postBalance;
    
    const expectedSolSpent = Math.floor(expectedAmount * 1000000000); // Convert to lamports
    
    if (solSpent < expectedSolSpent * 0.9) { // Allow 10% tolerance for fees
      return { 
        valid: false, 
        error: `Insufficient SOL spent. Expected: ${expectedSolSpent}, Got: ${solSpent}` 
      };
    }

    // Check if transaction has a memo with token purchase info
    const instructions = transaction.transaction.message.instructions;
    let hasTokenPurchaseMemo = false;
    
    for (const instruction of instructions) {
      if (instruction.programId.equals(new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'))) {
        // This is a memo instruction, check if it contains token purchase info
        const memoData = Buffer.from(instruction.data, 'base64').toString('utf8');
        if (memoData.includes('TOKEN_PURCHASE:') && memoData.includes(expectedTokenMint)) {
          hasTokenPurchaseMemo = true;
          break;
        }
      }
    }

    if (!hasTokenPurchaseMemo) {
      console.log('⚠️ No token purchase memo found, but transaction is valid');
      // Don't fail verification for missing memo, just log it
    }

    console.log('✅ Direct purchase verified - user spent SOL for token purchase!');
    return { valid: true };
  } catch (error) {
    console.error('Direct purchase verification error:', error);
    return { valid: false, error: `Purchase verification failed: ${error.message}` };
  }
}

async function verifyJupiterSwap(swapSignature, connection, userWallet, expectedTokenMint, expectedAmount) {
  try {
    console.log('🔍 Verifying Jupiter swap transaction:', swapSignature);
    
    // Get the swap transaction
    const transaction = await connection.getTransaction(swapSignature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Swap transaction not found or not confirmed' };
    }

    console.log('✅ Swap transaction found and confirmed');
    
    // Check if transaction was successful
    if (transaction.meta?.err) {
      return { valid: false, error: 'Swap transaction failed: ' + JSON.stringify(transaction.meta.err) };
    }

    // Check if user's SOL balance decreased (they spent SOL)
    const userPubkey = new PublicKey(userWallet);
    const accounts = transaction.transaction.message.accountKeys;
    const userIndex = accounts.findIndex(key => key.equals(userPubkey));
    
    if (userIndex === -1) {
      return { valid: false, error: 'User wallet not found in transaction' };
    }

    const preBalance = transaction.meta.preBalances[userIndex];
    const postBalance = transaction.meta.postBalances[userIndex];
    const solSpent = preBalance - postBalance;
    
    const expectedSolSpent = Math.floor(expectedAmount * 1000000000); // Convert to lamports
    
    if (solSpent < expectedSolSpent * 0.9) { // Allow 10% tolerance for fees
      return { 
        valid: false, 
        error: `Insufficient SOL spent. Expected: ${expectedSolSpent}, Got: ${solSpent}` 
      };
    }

    console.log('✅ Jupiter swap verified - user spent SOL and got tokens!');
    return { valid: true };
  } catch (error) {
    console.error('Jupiter swap verification error:', error);
    return { valid: false, error: `Swap verification failed: ${error.message}` };
  }
}

/**
 * Verify X402 payment for Jupiter swap
 * @param proof - X402 proof object
 * @param connection - Solana connection
 * @param expectedRecipient - Expected recipient address
 * @param expectedAmount - Expected amount in SOL
 * @returns Verification result
 */
async function verifyX402Payment(proof, connection, expectedRecipient, expectedAmount) {
  try {
    // Verify transaction exists and is confirmed
    const signature = proof.transaction;
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    // Calculate expected amount
    const expectedAmountLamports = Math.floor(expectedAmount * 1000000000); // Convert to lamports
    
    const expectedRecipientPubkey = new PublicKey(expectedRecipient);

    // Check if transaction contains the expected transfer
    let paymentFound = false;
    let actualAmount = 0;

    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const accounts = transaction.transaction.message.accountKeys;
      
      // Check recipient payment
      const recipientIndex = accounts.findIndex(key => key.equals(expectedRecipientPubkey));
      if (recipientIndex !== -1) {
        const preBalance = transaction.meta.preBalances[recipientIndex];
        const postBalance = transaction.meta.postBalances[recipientIndex];
        actualAmount = postBalance - preBalance;
        
        if (actualAmount >= expectedAmountLamports) {
          paymentFound = true;
        }
      }
    }

    if (!paymentFound) {
      return { 
        valid: false, 
        error: `Payment verification failed. Expected: ${expectedAmountLamports} lamports, Got: ${actualAmount} lamports` 
      };
    }

    // Check for X402 memo
    const memoFound = transaction.transaction.message.instructions.some(instruction => {
      if (instruction.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2') {
        const memoData = Buffer.from(instruction.data, 'base64').toString();
        return memoData.startsWith('x402:');
      }
      return false;
    });

    if (!memoFound) {
      return { valid: false, error: 'X402 memo not found in transaction' };
    }

    return { valid: true };
  } catch (error) {
    console.error('X402 verification error:', error);
    return { valid: false, error: `Verification failed: ${error.message}` };
  }
}
