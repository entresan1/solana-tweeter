const treasuryService = require('./treasury-service');
const { secureAuthMiddleware } = require('./secure-auth-middleware');

module.exports = async (req, res) => {
  // Apply security middleware for consistent CSRF token management
  secureAuthMiddleware(req, res, () => {
    handleRequest(req, res);
  });
};

async function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query parameters
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    // Validate parameters
    if (limit < 1 || limit > 100) {
      return res.status(400).json({ 
        error: 'Invalid limit', 
        message: 'Limit must be between 1 and 100' 
      });
    }

    if (offset < 0) {
      return res.status(400).json({ 
        error: 'Invalid offset', 
        message: 'Offset must be 0 or greater' 
      });
    }

    // Get beacons from secure service
    const beacons = await treasuryService.getBeacons(limit, offset);

    return res.status(200).json({
      success: true,
      beacons,
      pagination: {
        limit,
        offset,
        count: beacons.length,
        hasMore: beacons.length === limit
      }
    });

  } catch (error) {
    console.error('❌ Beacons API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch beacons'
    });
  }
}
