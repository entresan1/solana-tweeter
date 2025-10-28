const { Connection } = require('@solana/web3.js');

// Initialize Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

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

  try {
    const { transaction } = req.query;

    if (!transaction) {
      return res.status(400).json({
        success: false,
        error: 'Transaction signature is required'
      });
    }

    console.log('🔍 Debugging memo for transaction:', transaction);

    // Get transaction details
    const tx = await connection.getTransaction(transaction, {
      commitment: 'confirmed',
    });

    if (!tx) {
      return res.status(200).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    console.log('🔍 Transaction found, checking instructions...');
    console.log('🔍 Number of instructions:', tx.transaction?.message?.instructions?.length || 0);

    let memos = [];
    let x402Memos = [];

    // Check all instructions
    if (tx.transaction?.message?.instructions) {
      const accounts = tx.transaction.message.accountKeys;
      console.log('🔍 Number of accounts:', accounts?.length || 0);
      
      for (let i = 0; i < tx.transaction.message.instructions.length; i++) {
        const instruction = tx.transaction.message.instructions[i];
        console.log(`🔍 Instruction ${i}:`, {
          programIdIndex: instruction.programIdIndex,
          accounts: instruction.accounts,
          data: instruction.data ? instruction.data.substring(0, 20) + '...' : 'none'
        });

        if (instruction.programIdIndex !== undefined) {
          const programId = accounts[instruction.programIdIndex];
          console.log(`🔍 Program ID for instruction ${i}:`, programId?.toString());
          
          // Check if this is a memo instruction
          if (programId && programId.toString() === 'MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2') {
            console.log(`🔍 Found memo instruction at index ${i}`);
            
            if (instruction.data) {
              const memoData = Buffer.from(instruction.data, 'base64').toString('utf8');
              console.log(`🔍 Memo data:`, memoData);
              
              memos.push(memoData);
              
              if (memoData.startsWith('x402:')) {
                x402Memos.push(memoData);
                console.log(`🔍 Found X402 memo:`, memoData);
              }
            }
          }
        }
      }
    }

    // Check logs as fallback
    let logMemos = [];
    if (tx.meta?.logMessages) {
      console.log('🔍 Checking logs for memo data...');
      for (const log of tx.meta.logMessages) {
        console.log('🔍 Log:', log);
        if (log.includes('x402') || log.includes('X402')) {
          logMemos.push(log);
        }
      }
    }

    return res.status(200).json({
      success: true,
      transaction: transaction,
      memos: memos,
      x402Memos: x402Memos,
      logMemos: logMemos,
      instructionCount: tx.transaction?.message?.instructions?.length || 0,
      accountCount: tx.transaction?.message?.accountKeys?.length || 0,
      hasMemoProgram: memos.length > 0,
      hasX402Memo: x402Memos.length > 0
    });

  } catch (error) {
    console.error('❌ Debug memo error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
