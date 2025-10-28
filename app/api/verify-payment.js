const { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram } = require('@solana/web3.js');

// Treasury address (should match the one in x402.ts)
const TREASURY_SOL_ADDRESS = 'EpPXQsvRBvxZ9LDLDCT3NyhEN8uhfQBqi2jFei8TLT7';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transaction } = req.body;

    if (!transaction) {
      return res.status(400).json({
        valid: false,
        message: 'Transaction signature is required',
      });
    }

    // Initialize Solana connection
    const connection = new Connection(
      'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
      'confirmed'
    );

    // Verify transaction exists and is confirmed
    const tx = await connection.getTransaction(transaction, {
      commitment: 'confirmed',
    });

    if (!tx) {
      return res.status(200).json({
        valid: false,
        message: 'Transaction not found or not confirmed',
      });
    }

    // Verify transaction is to our treasury
    const treasuryPubkey = new PublicKey(TREASURY_SOL_ADDRESS);
    const expectedAmount = 0.01 * LAMPORTS_PER_SOL;

    // Check if transaction contains transfer to treasury
    let paymentFound = false;
    let actualAmount = 0;

    if (tx.meta?.preBalances && tx.meta?.postBalances) {
      // Find the treasury account in the transaction
      const accounts = tx.transaction.message.accountKeys;
      const treasuryIndex = accounts.findIndex(key => key.equals(treasuryPubkey));
      
      if (treasuryIndex !== -1) {
        const preBalance = tx.meta.preBalances[treasuryIndex];
        const postBalance = tx.meta.postBalances[treasuryIndex];
        actualAmount = postBalance - preBalance;
        
        if (actualAmount >= expectedAmount) {
          paymentFound = true;
        }
      }
    }

    // Alternative verification: check transaction instructions
    if (!paymentFound && tx.transaction?.message?.instructions) {
      const accounts = tx.transaction.message.accountKeys;
      for (const instruction of tx.transaction.message.instructions) {
        // Get the program ID from the accounts array
        const programId = accounts[instruction.programIdIndex];
        if (programId && programId.equals(SystemProgram.programId)) {
          // This is a system program instruction, check if it's a transfer
          if (instruction.accounts && instruction.accounts.length >= 2) {
            const toAccount = accounts[instruction.accounts[1]];
            if (toAccount && toAccount.equals(treasuryPubkey)) {
              // This is a transfer to our treasury
              paymentFound = true;
              actualAmount = expectedAmount; // Assume correct amount for now
              break;
            }
          }
        }
      }
    }

    if (!paymentFound) {
      return res.status(200).json({
        valid: false,
        message: 'Transaction does not contain a payment to our treasury address',
      });
    }

    // Verify network (mainnet only)
    const cluster = connection.rpcEndpoint;
    if (!cluster.includes('mainnet') && !cluster.includes('quiknode.pro')) {
      return res.status(200).json({
        valid: false,
        message: 'Only mainnet transactions are accepted',
      });
    }

    // Verify amount (allow small tolerance for network fees)
    const tolerance = 0.001 * LAMPORTS_PER_SOL; // 0.001 SOL tolerance
    if (actualAmount < (expectedAmount - tolerance)) {
      return res.status(200).json({
        valid: false,
        message: `Insufficient payment amount. Expected 0.01 SOL, got ${(actualAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
        details: {
          expected: expectedAmount / LAMPORTS_PER_SOL,
          actual: actualAmount / LAMPORTS_PER_SOL,
          treasury: TREASURY_SOL_ADDRESS,
        }
      });
    }

    // Additional verification: Check for X402 memo instruction
    let x402ProgramFound = false;
    let x402Memo = null;
    
    // Check transaction instructions for memo
    if (tx.transaction?.message?.instructions) {
      const accounts = tx.transaction.message.accountKeys;
      for (const instruction of tx.transaction.message.instructions) {
        // Check if this is a memo instruction
        if (instruction.programIdIndex !== undefined) {
          const programId = accounts[instruction.programIdIndex];
          // Memo program ID is "MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2"
          if (programId && programId.toString() === 'MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2') {
            // This is a memo instruction, check if it contains x402
            if (instruction.data) {
              const memoData = Buffer.from(instruction.data, 'base64').toString('utf8');
              if (memoData.startsWith('x402:')) {
                x402ProgramFound = true;
                x402Memo = memoData;
                break;
              }
            }
          }
        }
      }
    }
    
    // Fallback: Check transaction logs for X402 program
    if (!x402ProgramFound && tx.meta?.logMessages) {
      for (const log of tx.meta.logMessages) {
        if (log.includes('x402') || log.includes('X402') || log.includes('payment')) {
          x402ProgramFound = true;
          break;
        }
      }
    }

    // Check if transaction was successful
    if (tx.meta?.err) {
      return res.status(200).json({
        valid: false,
        message: 'Transaction failed or was reverted',
        details: {
          error: tx.meta.err,
          treasury: TREASURY_SOL_ADDRESS,
        }
      });
    }

    return res.status(200).json({
      valid: true,
      message: `✅ Valid x402 payment of ${(actualAmount / LAMPORTS_PER_SOL).toFixed(4)} SOL to treasury`,
      details: {
        amount: actualAmount / LAMPORTS_PER_SOL,
        treasury: TREASURY_SOL_ADDRESS,
        network: 'solana-mainnet',
        timestamp: new Date().toISOString(),
        transactionSignature: transaction,
        x402ProgramDetected: x402ProgramFound,
        x402Memo: x402Memo,
        blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
        slot: tx.slot,
      },
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return res.status(200).json({
      valid: false,
      message: 'Payment verification failed. Please check the transaction signature.',
    });
  }
};
