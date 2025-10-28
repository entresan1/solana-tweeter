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

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, content, author, author_display, timestamp, treasury_transaction, platform_wallet } = req.body;

    // Validate required fields
    if (!content || !author) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'content and author are required',
      });
    }

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

    // Save beacon to database
    const beaconData = {
      topic: topic || 'general',
      content,
      author,
      author_display: author_display || author.slice(0, 8) + '...',
      timestamp: timestamp || Date.now(),
      treasury_transaction: treasury_transaction,
      platform_wallet: platform_wallet || false,
    };

    console.log('💾 Saving beacon to database:', beaconData);

    const { data: savedBeacon, error: dbError } = await supabase
      .from('beacons')
      .insert([beaconData])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database save error:', dbError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to save beacon to database',
      });
    }

    console.log('✅ Beacon saved to database:', savedBeacon);

    return res.status(200).json({
      success: true,
      message: 'Beacon saved successfully',
      beacon: savedBeacon,
    });

  } catch (error) {
    console.error('❌ Save beacon API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to save beacon',
    });
  }
};
