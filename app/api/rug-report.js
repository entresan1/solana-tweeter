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
    const { beaconId, reporter, reporter_display, isRug } = req.body;

    if (!beaconId || !reporter || typeof isRug !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'beaconId, reporter, and isRug are required',
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

    if (isRug) {
      // Add rug report
      const rugData = {
        beacon_id: beaconId,
        reporter_wallet: reporter,
        reporter_display: reporter_display || reporter.slice(0, 8) + '...',
        reason: '',
        timestamp: Date.now(),
      };

      console.log('☠️ Adding rug report:', rugData);

      const { data: savedRug, error: dbError } = await supabase
        .from('rug_reports')
        .insert([rugData])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database save error for rug report:', dbError);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to save rug report to database',
        });
      }

      console.log('✅ Rug report saved to database:', savedRug);

      return res.status(200).json({
        success: true,
        message: 'Rug reported successfully',
        rug: savedRug,
      });
    } else {
      // Remove rug report
      console.log('☠️ Removing rug report for beacon:', beaconId, 'reporter:', reporter);

      const { error: deleteError } = await supabase
        .from('rug_reports')
        .delete()
        .eq('beacon_id', beaconId)
        .eq('reporter_wallet', reporter);

      if (deleteError) {
        console.error('❌ Database delete error for rug report:', deleteError);
        return res.status(500).json({
          error: 'Database Error',
          message: 'Failed to remove rug report from database',
        });
      }

      console.log('✅ Rug report removed from database');

      return res.status(200).json({
        success: true,
        message: 'Rug report removed successfully',
      });
    }

  } catch (error) {
    console.error('❌ Rug report API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process rug report request',
    });
  }
};
