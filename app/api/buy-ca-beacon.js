const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { beaconId, userWallet, contractAddress } = req.body;

  if (!beaconId || !userWallet || !contractAddress) {
    return res.status(400).json({ error: 'Missing required fields: beaconId, userWallet, contractAddress' });
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
    if (content.length !== 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(content)) {
      return res.status(400).json({ error: 'This is not a valid CA beacon' });
    }

    // Verify contract address matches
    if (content !== contractAddress) {
      return res.status(400).json({ error: 'Contract address mismatch' });
    }

    // Record the CA purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('ca_purchases')
      .insert({
        beacon_id: beaconId,
        buyer_wallet: userWallet,
        contract_address: contractAddress,
        purchase_amount: 0.001, // Standard beacon price
        platform_fee: 0.00005, // 5% of 0.001 SOL
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Failed to record CA purchase:', purchaseError);
      return res.status(500).json({ error: 'Failed to record purchase', details: purchaseError.message });
    }

    // Update beacon stats (increment purchase count)
    const { error: updateError } = await supabase
      .from('beacons')
      .update({ 
        purchase_count: (beacon.purchase_count || 0) + 1,
        last_purchased_at: new Date().toISOString()
      })
      .eq('id', beaconId);

    if (updateError) {
      console.warn('Failed to update beacon stats:', updateError);
      // Don't fail the purchase for this
    }

    return res.status(200).json({ 
      success: true, 
      purchase,
      message: `Successfully purchased CA beacon for ${contractAddress}`,
      platformFee: 0.00005,
      totalCost: 0.001
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
