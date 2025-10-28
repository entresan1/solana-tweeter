const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');
const { createMemoInstruction } = require('@solana/spl-memo');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize Solana connection - USE QUICKNODE ONLY
const rpcUrl = process.env.SOLANA_RPC_URL || process.env.VITE_SOLANA_RPC_URL || 'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/';
const connection = new Connection(rpcUrl, 'confirmed');

// Tax wallet address (this will collect all fees)
const TAX_WALLET_ADDRESS = process.env.TAX_WALLET_ADDRESS || '7TrtCWM1FKjTrMp6AqZnK5yWFj4QXEvjPfmgUEouModi';

// Distribution addresses (where tax wallet sends money)
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || 'EpPXQsvRBvxZ9LDLDCT3NyhEN8uhfQBqi2jFei8TLT7';
const DEVELOPMENT_FUND = process.env.DEVELOPMENT_FUND || 'EpPXQsvRBvxZ9LDLDCT3NyhEN8uhfQBqi2jFei8TLT7';
const MARKETING_FUND = process.env.MARKETING_FUND || 'EpPXQsvRBvxZ9LDLDCT3NyhEN8uhfQBqi2jFei8TLT7';

module.exports = async (req, res) => {
  // Check environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ 
      error: 'Server configuration error', 
      message: 'Missing required environment variables' 
    });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Get tax wallet balance and recent transactions
    try {
      const taxWalletPubkey = new PublicKey(TAX_WALLET_ADDRESS);
      const balance = await connection.getBalance(taxWalletPubkey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      // Get recent transactions
      const signatures = await connection.getSignaturesForAddress(taxWalletPubkey, { limit: 10 });
      
      return res.status(200).json({
        success: true,
        taxWallet: {
          address: TAX_WALLET_ADDRESS,
          balance: solBalance,
          recentTransactions: signatures.length
        },
        distribution: {
          treasury: TREASURY_ADDRESS,
          development: DEVELOPMENT_FUND,
          marketing: MARKETING_FUND
        }
      });
    } catch (error) {
      console.error('Tax wallet info error:', error);
      return res.status(500).json({ error: 'Failed to get tax wallet info' });
    }
  }

  if (req.method === 'POST') {
    // Process tax collection and distribution
    const { action, amount, recipient, memo } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    try {
      if (action === 'collect_tax') {
        // Collect tax from a transaction
        const { fromAddress, taxAmount, transactionType } = req.body;
        
        if (!fromAddress || !taxAmount) {
          return res.status(400).json({ error: 'fromAddress and taxAmount are required' });
        }

        // Create transaction to send tax to tax wallet
        const fromPubkey = new PublicKey(fromAddress);
        const taxWalletPubkey = new PublicKey(TAX_WALLET_ADDRESS);
        const lamports = Math.floor(taxAmount * LAMPORTS_PER_SOL);

        const transaction = new Transaction();
        
        // Add tax transfer
        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey: taxWalletPubkey,
            lamports
          })
        );

        // Add memo
        const taxMemo = `x402:tax:${transactionType}:${Date.now()}`;
        transaction.add(createMemoInstruction(taxMemo));

        // Get recent blockhash
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        });

        return res.status(200).json({
          success: true,
          transaction: serializedTransaction.toString('base64'),
          memo: taxMemo,
          message: `Tax collection transaction created: ${taxAmount} SOL → Tax Wallet`
        });

      } else if (action === 'distribute_taxes') {
        // Distribute collected taxes to different funds
        const { distribution } = req.body;
        
        if (!distribution) {
          return res.status(400).json({ error: 'Distribution configuration is required' });
        }

        // Get tax wallet balance
        const taxWalletPubkey = new PublicKey(TAX_WALLET_ADDRESS);
        const balance = await connection.getBalance(taxWalletPubkey);
        const solBalance = balance / LAMPORTS_PER_SOL;

        if (solBalance < 0.001) {
          return res.status(400).json({ error: 'Insufficient tax wallet balance for distribution' });
        }

        // Calculate distribution amounts
        const treasuryAmount = solBalance * (distribution.treasuryPercent || 0.5);
        const devAmount = solBalance * (distribution.developmentPercent || 0.3);
        const marketingAmount = solBalance * (distribution.marketingPercent || 0.2);

        const transaction = new Transaction();

        // Add transfers to each fund
        if (treasuryAmount > 0.001) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: taxWalletPubkey,
              toPubkey: new PublicKey(TREASURY_ADDRESS),
              lamports: Math.floor(treasuryAmount * LAMPORTS_PER_SOL)
            })
          );
        }

        if (devAmount > 0.001) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: taxWalletPubkey,
              toPubkey: new PublicKey(DEVELOPMENT_FUND),
              lamports: Math.floor(devAmount * LAMPORTS_PER_SOL)
            })
          );
        }

        if (marketingAmount > 0.001) {
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: taxWalletPubkey,
              toPubkey: new PublicKey(MARKETING_FUND),
              lamports: Math.floor(marketingAmount * LAMPORTS_PER_SOL)
            })
          );
        }

        // Add distribution memo
        const distMemo = `x402:tax-distribution:${Date.now()}:T${treasuryAmount.toFixed(4)}:D${devAmount.toFixed(4)}:M${marketingAmount.toFixed(4)}`;
        transaction.add(createMemoInstruction(distMemo));

        // Get recent blockhash
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = taxWalletPubkey;

        // Serialize transaction
        const serializedTransaction = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false
        });

        return res.status(200).json({
          success: true,
          transaction: serializedTransaction.toString('base64'),
          memo: distMemo,
          distribution: {
            treasury: treasuryAmount,
            development: devAmount,
            marketing: marketingAmount,
            total: solBalance
          },
          message: `Tax distribution transaction created`
        });

      } else {
        return res.status(400).json({ error: 'Invalid action. Use "collect_tax" or "distribute_taxes"' });
      }

    } catch (error) {
      console.error('Tax wallet error:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
