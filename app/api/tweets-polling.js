const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voskmcxmtvophehityoa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const { page = 1, limit = 20, since } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    console.log('📊 Polling tweets:', { page: pageNum, limit: limitNum, since });

    let query = supabase
      .from('beacons')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // If since parameter is provided, filter by timestamp
    if (since) {
      const sinceDate = new Date(parseInt(since));
      query = query.gte('created_at', sinceDate.toISOString());
    }

    const { data: beacons, error } = await query;

    if (error) {
      console.error('❌ Error fetching beacons:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch beacons',
        error: error.message 
      });
      return;
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('beacons')
      .select('*', { count: 'exact', head: true });

    const totalPages = Math.ceil((count || 0) / limitNum);

    res.status(200).json({
      success: true,
      data: {
        tweets: beacons || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Error in tweets polling:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
};
