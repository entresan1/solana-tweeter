const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  return true;
}

// Input validation
function validateInput(page, limit, since) {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  // Validate page
  if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
    return { valid: false, error: 'Invalid page number' };
  }
  
  // Validate limit
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return { valid: false, error: 'Invalid limit' };
  }
  
  // Validate since timestamp
  if (since && (isNaN(parseInt(since)) || parseInt(since) < 0)) {
    return { valid: false, error: 'Invalid since timestamp' };
  }
  
  return { valid: true, page: pageNum, limit: limitNum, since: since ? parseInt(since) : null };
}

module.exports = async (req, res) => {
  // Set CORS headers - SECURITY: Restrict to specific origins
  const allowedOrigins = [
    'https://trenchbeacon.com',
    'https://www.trenchbeacon.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', true);
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

  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   'unknown';
  
  if (!checkRateLimit(clientIP)) {
    res.status(429).json({ 
      success: false, 
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60
    });
    return;
  }

  try {
    const { page = 1, limit = 20, since } = req.query;
    
    // Validate input
    const validation = validateInput(page, limit, since);
    if (!validation.valid) {
      res.status(400).json({ 
        success: false, 
        message: validation.error 
      });
      return;
    }
    
    const { page: pageNum, limit: limitNum, since: sinceTimestamp } = validation;
    const offset = (pageNum - 1) * limitNum;

    console.log('📊 Polling tweets:', { page: pageNum, limit: limitNum, since });

    let query = supabase
      .from('beacons')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // If since parameter is provided, filter by timestamp
    if (sinceTimestamp) {
      const sinceDate = new Date(sinceTimestamp);
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
