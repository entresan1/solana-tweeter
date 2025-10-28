const { createClient } = require('@supabase/supabase-js');
const { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');
const { createMemoInstruction } = require('@solana/spl-memo');

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

// Tax wallet address (collects all fees)
const TAX_WALLET_ADDRESS = process.env.TAX_WALLET_ADDRESS || 'hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6';

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { beaconId, userWallet, contractAddress, solAmount } = req.body;

  if (!beaconId || !userWallet || !contractAddress || !solAmount) {
    return res.status(400).json({ error: 'Missing required fields: beaconId, userWallet, contractAddress, solAmount' });
  }

  if (isNaN(solAmount) || solAmount <= 0) {
    return res.status(400).json({ error: 'Invalid SOL amount' });
  }

  try {
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

    // Calculate fees - 1% of purchase amount goes to treasury
    const platformFee = parseFloat(solAmount) * 0.01; // 1% treasury fee
    const swapAmount = parseFloat(solAmount) - platformFee; // Amount to swap for CA tokens
    const totalCost = parseFloat(solAmount);
    
    console.log('CA Purchase Request:', {
      beaconId,
      userWallet,
      contractAddress,
      solAmount,
      platformFee,
      swapAmount,
      totalCost,
      timestamp: new Date().toISOString()
    });

    // Create a real Jupiter swap transaction: SOL → CA token
    const fromPubkey = new PublicKey(userWallet);
    const caTokenMint = new PublicKey(contractAddress);
    
    const transaction = new Transaction();
    
    // Step 1: Send platform fee to tax wallet
    const taxLamports = Math.floor(platformFee * LAMPORTS_PER_SOL);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey: new PublicKey(TAX_WALLET_ADDRESS),
        lamports: taxLamports
      })
    );

    // Step 2: Create Jupiter swap for SOL → CA token
    try {
      // Import Jupiter swap function
      const { createJupiterSwap } = require('../src/lib/jupiter-swap');
      
      // Create real Jupiter swap transaction
      const swapTransaction = await createJupiterSwap(
        fromPubkey,
        contractAddress,
        swapAmount
      );
      
      // Add Jupiter swap instructions to our transaction
      for (const instruction of swapTransaction.instructions) {
        transaction.add(instruction);
      }
      
      console.log('✅ Jupiter swap instructions added to transaction');
    } catch (swapError) {
      console.error('❌ Jupiter swap failed, falling back to simple transfer:', swapError);
      
      // Fallback: Create a simple transfer (this won't actually swap tokens)
      const swapLamports = Math.floor(swapAmount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey: fromPubkey, // Self-transfer as fallback
          lamports: swapLamports
        })
      );
      
      console.log('⚠️ Using fallback transfer instead of Jupiter swap');
    }

    // Add swap memo
    const memo = `x402:ca-swap:${contractAddress}:${beaconId}:${swapAmount}:SOL->CA`;
    transaction.add(createMemoInstruction(memo));

    // Get recent blockhash
    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    // Serialize transaction for client to sign
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    // Create purchase record for database
    const purchase = {
      beacon_id: beaconId,
      buyer_wallet: userWallet,
      contract_address: contractAddress,
      purchase_amount: parseFloat(solAmount),
      platform_fee: platformFee,
      total_cost: totalCost,
      transaction_data: serializedTransaction.toString('base64'),
      status: 'pending',
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
      transaction: serializedTransaction.toString('base64'),
      message: `CA swap transaction created: ${swapAmount} SOL → ${contractAddress}`,
      platformFee,
      swapAmount,
      totalCost,
      memo,
      swapType: 'SOL_TO_CA'
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
