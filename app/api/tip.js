const { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram } = require('@solana/web3.js');

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
    // Initialize Solana connection
    const connection = new Connection(
      'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
      'confirmed'
    );

    console.log('💰 Tip request body:', req.body);

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
          config: { description: `Tip ${req.body.amount} SOL to ${req.body.recipient.slice(0, 8)}...` },
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
    console.log('🔍 Verifying tip payment proof:', proof);
    const verification = await verifyTipPayment(proof, connection, req.body.recipient, req.body.amount);
    console.log('🔍 Tip payment verification result:', verification);
    
    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Verification Failed',
        message: verification.error || 'Invalid payment proof',
        payment: {
          network: 'solana',
          recipient: req.body.recipient,
          price: { token: 'SOL', amount: req.body.amount },
          config: { description: `Tip ${req.body.amount} SOL to ${req.body.recipient.slice(0, 8)}...` },
        },
      });
    }

    // If we reach here, payment was verified successfully
    const { recipient, amount, message, beaconId, tipper, tipper_display } = req.body;

    // Validate required fields
    if (!recipient || !amount || !tipper || !beaconId) {
      console.log('❌ Missing required fields:', { recipient, amount, tipper, beaconId });
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'recipient, amount, tipper, and beaconId are required',
      });
    }

    // Validate amount
    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount < 0.001 || tipAmount > 10) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Tip amount must be between 0.001 and 10 SOL',
      });
    }

    // Calculate 5% tax fee
    const taxFee = tipAmount * 0.05;
    const recipientAmount = tipAmount - taxFee;

    console.log('💰 Tip breakdown:', {
      originalAmount: tipAmount,
      taxFee: taxFee,
      recipientAmount: recipientAmount
    });

    // Save tip to Supabase database
    const tipData = {
      recipient,
      amount: tipAmount,
      recipient_amount: recipientAmount,
      tax_fee: taxFee,
      message: message || '',
      beacon_id: beaconId,
      tipper,
      tipper_display: tipper_display || tipper.slice(0, 8) + '...',
      timestamp: Date.now(),
      treasury_transaction: proof.transaction,
    };

    console.log('💾 Saving tip to database:', tipData);

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

      // Insert tip into database
      const { data: savedTip, error: dbError } = await supabase
        .from('tips')
        .insert([{
          recipient: tipData.recipient,
          amount: tipData.amount,
          message: tipData.message,
          beacon_id: tipData.beacon_id,
          tipper: tipData.tipper,
          tipper_display: tipData.tipper_display,
          timestamp: tipData.timestamp,
          treasury_transaction: tipData.treasury_transaction,
        }])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save error:', dbError);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to save tip to database',
        });
      }

      console.log('✅ Tip saved to database:', savedTip);

      return res.status(200).json({
        success: true,
        message: 'Tip sent successfully',
        tip: savedTip,
        payment: {
          transaction: proof.transaction,
          amount: proof.amount,
        },
      });

    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to save tip to database',
      });
    }
  } catch (error) {
    console.error('❌ Tip API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process tip request',
    });
  }
};

/**
 * Verifies a tip payment
 * @param proof - The x402 proof object
 * @param connection - The Solana connection object
 * @param expectedRecipient - The expected recipient address
 * @param expectedAmount - The expected tip amount
 * @returns An object indicating validity and an error message if invalid
 */
async function verifyTipPayment(proof, connection, expectedRecipient, expectedAmount) {
  try {
    // Verify transaction exists and is confirmed
    const signature = proof.transaction;
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return { valid: false, error: 'Transaction not found or not confirmed' };
    }

    // Calculate expected amounts (5% to tax wallet, 95% to recipient)
    const taxFee = expectedAmount * 0.05;
    const recipientAmount = expectedAmount - taxFee;
    const expectedRecipientLamports = Math.floor(recipientAmount * LAMPORTS_PER_SOL);
    const expectedTaxLamports = Math.floor(taxFee * LAMPORTS_PER_SOL);
    
    const expectedRecipientPubkey = new PublicKey(expectedRecipient);
    const taxWalletPubkey = new PublicKey('hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6');

    // Check if transaction contains both transfers (recipient + tax wallet)
    let recipientPaymentFound = false;
    let taxPaymentFound = false;
    let actualRecipientAmount = 0;
    let actualTaxAmount = 0;

    if (transaction.meta?.preBalances && transaction.meta?.postBalances) {
      const accounts = transaction.transaction.message.accountKeys;
      
      // Check recipient payment
      const recipientIndex = accounts.findIndex(key => key.equals(expectedRecipientPubkey));
      if (recipientIndex !== -1) {
        const preBalance = transaction.meta.preBalances[recipientIndex];
        const postBalance = transaction.meta.postBalances[recipientIndex];
        actualRecipientAmount = postBalance - preBalance;
        
        if (actualRecipientAmount >= expectedRecipientLamports) {
          recipientPaymentFound = true;
        }
      }
      
      // Check tax wallet payment
      const taxIndex = accounts.findIndex(key => key.equals(taxWalletPubkey));
      if (taxIndex !== -1) {
        const preBalance = transaction.meta.preBalances[taxIndex];
        const postBalance = transaction.meta.postBalances[taxIndex];
        actualTaxAmount = postBalance - preBalance;
        
        if (actualTaxAmount >= expectedTaxLamports) {
          taxPaymentFound = true;
        }
      }
    }

    // Alternative verification: check transaction instructions
    if ((!recipientPaymentFound || !taxPaymentFound) && transaction.transaction?.message?.instructions) {
      const accounts = transaction.transaction.message.accountKeys;
      for (const instruction of transaction.transaction.message.instructions) {
        const programId = accounts[instruction.programIdIndex];
        if (programId && programId.equals(SystemProgram.programId)) {
          if (instruction.accounts && instruction.accounts.length >= 2) {
            const toAccount = accounts[instruction.accounts[1]];
            
            if (toAccount && toAccount.equals(expectedRecipientPubkey)) {
              recipientPaymentFound = true;
              actualRecipientAmount = expectedRecipientLamports;
            }
            
            if (toAccount && toAccount.equals(taxWalletPubkey)) {
              taxPaymentFound = true;
              actualTaxAmount = expectedTaxLamports;
            }
          }
        }
      }
    }

    if (!recipientPaymentFound) {
      return { valid: false, error: 'Recipient payment not found or insufficient amount' };
    }
    
    if (!taxPaymentFound) {
      return { valid: false, error: 'Tax fee payment not found or insufficient amount' };
    }

    console.log('✅ Tip payment verified:', {
      recipientAmount: actualRecipientAmount / LAMPORTS_PER_SOL,
      taxAmount: actualTaxAmount / LAMPORTS_PER_SOL,
      totalAmount: (actualRecipientAmount + actualTaxAmount) / LAMPORTS_PER_SOL
    });

    // Verify network (mainnet only)
    const cluster = connection.rpcEndpoint;
    if (!cluster.includes('mainnet') && !cluster.includes('quiknode.pro')) {
      return { valid: false, error: 'Only mainnet payments are accepted' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Tip payment verification error:', error);
    return { valid: false, error: 'Payment verification failed' };
  }
}

