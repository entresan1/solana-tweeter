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

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing environment variables',
        message: 'Supabase credentials not found'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test insert with the exact same data structure as the real API
    const testData = {
      topic: 'general', // Ensure topic is never null
      content: 'Test beacon content',
      author: 'test-author-123',
      author_display: 'test-author...',
      timestamp: new Date().toISOString(),
      treasury_transaction: 'test-tx-123',
    };

    console.log('🧪 Testing beacon insert with data:', testData);

    const { data: savedBeacon, error: dbError } = await supabase
      .from('beacons')
      .insert([testData])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Test insert failed:', dbError);
      return res.status(500).json({
        error: 'Test insert failed',
        message: dbError.message,
        code: dbError.code,
        details: dbError.details,
        hint: dbError.hint
      });
    }

    // Clean up test data
    await supabase
      .from('beacons')
      .delete()
      .eq('treasury_transaction', 'test-tx-123');

    return res.status(200).json({
      success: true,
      message: 'Test insert successful',
      testData,
      savedBeacon
    });

  } catch (error) {
    console.error('❌ Test API error:', error);
    return res.status(500).json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack
    });
  }
};
