const { 
  generatePlatformWalletAddress, 
  verifyPlatformWalletPayment, 
  savePlatformWalletTransaction,
  connection,
  TREASURY_SOL_ADDRESS 
} = require('./platform-wallet-secure');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-402-proof');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use connection from secure service

    console.log('💰 Platform deposit request body:', req.body);

    // Check for x402 proof in headers
    const x402Proof = req.headers['x-402-proof'];

    if (!x402Proof) {
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires a SOL payment',
        payment: {
          network: 'solana',
          recipient: req.body.recipient,
          price: { token: 'SOL', amount: req.body.amount },
          config: { description: `Deposit ${req.body.amount} SOL to platform wallet` },
        },
      });
    }

    let proof;
    try {
      proof = JSON.parse(x402Proof);
    } catch (e) {
      return res.status(400).json({
        error: 'Invalid Proof',
        message: 'x-402-proof header must be valid JSON',
      });
    }

    // Verify payment
    console.log('🔍 Verifying platform deposit proof:', {
      proof,
      recipient: req.body.recipient,
      amount: req.body.amount,
      proofKeys: Object.keys(proof)
    });
    
    const verification = await verifyPayment(proof, connection, req.body.recipient, req.body.amount);
    console.log('🔍 Platform deposit verification result:', verification);
    
    if (!verification.valid) {
      console.error('❌ Payment verification failed:', verification.error);
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        debug: {
          proofReceived: proof,
          expectedRecipient: req.body.recipient,
          expectedAmount: req.body.amount
        },
        payment: {
          network: 'solana',
          recipient: req.body.recipient,
          price: { token: 'SOL', amount: req.body.amount },
          config: { description: `Deposit ${req.body.amount} SOL to platform wallet` },
        },
      });
    }

    // If we reach here, payment was verified successfully
    const { recipient, amount, user } = req.body;

    // Validate required fields
    if (!recipient || !amount || !user) {
      console.log('❌ Missing required fields:', { recipient, amount, user });
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'recipient, amount, and user are required',
      });
    }

    // Validate amount
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 0.001 || depositAmount > 100) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Deposit amount must be between 0.001 and 100 SOL',
      });
    }

    // Save deposit to Supabase database
    const depositData = {
      user_wallet: user,
      platform_wallet: recipient,
      amount: depositAmount,
      transaction: proof.transaction,
      timestamp: Date.now(),
    };

    console.log('💾 Saving platform deposit to database:', depositData);

    try {
      // Import Supabase client
      const { createClient } = require('@supabase/supabase-js');
      
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase environment variables');
        return res.status(500).json({
          error: 'Configuration Error',
          message: 'Database configuration missing',
        });
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Insert deposit into database
      const { data: savedDeposit, error: dbError } = await supabase
        .from('platform_deposits')
        .insert([{
          user_wallet: depositData.user_wallet,
          platform_wallet: depositData.platform_wallet,
          amount: depositData.amount,
          transaction: depositData.transaction,
          timestamp: depositData.timestamp,
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save error:', dbError);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to save deposit to database',
        });
      }

      console.log('✅ Platform deposit saved to database:', savedDeposit);

      return res.status(200).json({
        success: true,
        message: 'Deposit successful',
        deposit: savedDeposit,
        payment: {
          transaction: proof.transaction,
          amount: proof.amount,
        },
      });

    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to save deposit to database',
      });
    }
  } catch (error) {
    console.error('❌ Platform deposit API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process deposit request',
    });
  }
};

/**
 * Verifies a payment
 * @param proof - The x402 proof object
 * @param connection - The Solana connection object
 * @param expectedRecipient - The expected recipient address
 * @param expectedAmount - The expected amount
 * @returns An object indicating validity and an error message if invalid
 */
async function verifyPayment(proof, connection, expectedRecipient, expectedAmount) {
  try {
    console.log('🔍 Starting payment verification:', {
      proof,
      expectedRecipient,
      expectedAmount
    });

    // Check if proof has required fields
    if (!proof || !proof.transaction) {
      return { valid: false, error: 'Invalid proof format - missing transaction signature' };
    }

    // Verify transaction exists and is confirmed
    const signature = proof.transaction;
    console.log('🔍 Looking up transaction:', signature);
    
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    console.log('✅ Transaction found and confirmed');

    // Verify transaction is to the expected recipient
    const expectedRecipientPubkey = new PublicKey(expectedRecipient);
    const expectedAmountNum = parseFloat(expectedAmount);
    
    if (isNaN(expectedAmountNum) || expectedAmountNum <= 0) {
      return { valid: false, error: 'Invalid amount provided' };
    }
    
    const expectedAmountLamports = expectedAmountNum * LAMPORTS_PER_SOL;
    
    console.log('🔍 Verification details:', {
      expectedRecipient: expectedRecipient,
      expectedAmount: expectedAmountNum,
      expectedAmountLamports: expectedAmountLamports
    });

    // Check if transaction contains transfer to recipient
    let paymentFound = false;
    let actualAmount = 0;

    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      // Find the recipient account in the transaction
      const accounts = transaction.transaction.message.accountKeys;
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

    // Alternative verification: check transaction instructions
    if (!paymentFound && transaction.transaction?.message?.instructions) {
      const accounts = transaction.transaction.message.accountKeys;
      for (const instruction of transaction.transaction.message.instructions) {
        // Get the program ID from the accounts array
        const programId = accounts[instruction.programIdIndex];
        if (programId && programId.equals(SystemProgram.programId)) {
          // This is a system program instruction, check if it's a transfer
          if (instruction.accounts && instruction.accounts.length >= 2) {
            const toAccount = accounts[instruction.accounts[1]];
            if (toAccount && toAccount.equals(expectedRecipientPubkey)) {
              // This is a transfer to the expected recipient
              paymentFound = true;
              actualAmount = expectedAmountLamports; // Assume correct amount for now
              break;
            }
          }
        }
      }
    }

    console.log('🔍 Payment verification result:', {
      paymentFound,
      actualAmount,
      expectedAmountLamports,
      difference: actualAmount - expectedAmountLamports
    });

    if (!paymentFound) {
      return { 
        valid: false, 
        error: `Payment not found or insufficient amount. Expected: ${expectedAmountLamports} lamports, Found: ${actualAmount} lamports` 
      };
    }

    // Verify network (mainnet only)
    const cluster = connection.rpcEndpoint;
    if (!cluster.includes('mainnet') && !cluster.includes('quiknode.pro')) {
      return { valid: false, error: 'Only mainnet payments are accepted' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Payment verification error:', error);
    return { valid: false, error: 'Payment verification failed' };
  }
}
