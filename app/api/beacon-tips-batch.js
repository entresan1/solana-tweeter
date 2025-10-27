const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voskmcxmtvophehityoa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { beaconIds } = req.query;
    
    if (!beaconIds) {
      return res.status(400).json({ error: 'beaconIds parameter is required' });
    }

    const beaconIdArray = beaconIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (beaconIdArray.length === 0) {
      return res.status(400).json({ error: 'No valid beacon IDs provided' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tips for all beacons in one query
    const { data: tips, error } = await supabase
      .from('tips')
      .select('beacon_id, amount, user_wallet, message, created_at')
      .in('beacon_id', beaconIdArray)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tips batch:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Process tips data
    const tipsMap = new Map();
    tips.forEach(tip => {
      if (!tipsMap.has(tip.beacon_id)) {
        tipsMap.set(tip.beacon_id, []);
      }
      tipsMap.get(tip.beacon_id).push({
        amount: parseFloat(tip.amount),
        user_wallet: tip.user_wallet,
        message: tip.message,
        created_at: tip.created_at
      });
    });

    // Format response
    const result = beaconIdArray.map(beaconId => {
      const beaconTips = tipsMap.get(beaconId) || [];
      const totalAmount = beaconTips.reduce((sum, tip) => sum + tip.amount, 0);
      
      return {
        beacon_id: beaconId,
        totalAmount,
        count: beaconTips.length,
        messages: beaconTips
      };
    });

    return res.status(200).json({
      success: true,
      tips: result,
      count: result.length
    });

  } catch (error) {
    console.error('Batch tips API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};