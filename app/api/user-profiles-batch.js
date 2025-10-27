const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voskmcxmtvophehityoa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://trenchbeacon.com');
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
    const { addresses } = req.query;
    
    if (!addresses) {
      return res.status(400).json({ error: 'addresses parameter is required' });
    }

    const addressArray = addresses.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0);
    
    if (addressArray.length === 0) {
      return res.status(400).json({ error: 'No valid addresses provided' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get profiles for all addresses in one query
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('wallet_address', addressArray);

    if (error) {
      console.error('Error fetching profiles batch:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(200).json({
      success: true,
      profiles: profiles || [],
      count: profiles?.length || 0
    });

  } catch (error) {
    console.error('Batch profiles API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
