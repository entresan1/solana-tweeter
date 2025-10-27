const { createClient } = require('@supabase/supabase-js');

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

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    // Fetch recent beacons with payment data
    const { data: beacons, error } = await supabase
      .from('beacons')
      .select('id, topic, content, author, author_display, timestamp, treasury_transaction')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Database fetch error:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to fetch payments',
      });
    }

    // Transform beacons into payment records
    const payments = beacons.map(beacon => ({
      id: beacon.id,
      treasury_transaction: beacon.treasury_transaction,
      author: beacon.author,
      author_display: beacon.author_display,
      amount: 0.01, // Fixed amount for x402
      timestamp: beacon.timestamp,
      content: beacon.content,
      topic: beacon.topic,
    }));

    return res.status(200).json({
      success: true,
      payments,
      count: payments.length,
    });

  } catch (error) {
    console.error('❌ Payments API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch payments',
    });
  }
};
