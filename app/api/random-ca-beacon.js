const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all beacons
    const { data: beacons, error } = await supabase
      .from('beacons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Failed to fetch beacons', details: error.message });
    }

    // Filter for actual CA beacons (containing 44 character base58 address)
    const caBeacons = beacons.filter(beacon => {
      const content = beacon.content?.trim() || '';
      const caMatch = content.match(/\b[1-9A-HJ-NP-Za-km-z]{44}\b/);
      return !!caMatch;
    });

    if (caBeacons.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No CA beacons available for gambling' 
      });
    }

    // Select a random CA beacon
    const randomIndex = Math.floor(Math.random() * caBeacons.length);
    const randomBeacon = caBeacons[randomIndex];

    return res.status(200).json({ 
      success: true, 
      beacon: randomBeacon,
      totalAvailable: caBeacons.length
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
