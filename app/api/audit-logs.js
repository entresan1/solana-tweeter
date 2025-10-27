const { 
  getAuditLogs, 
  logAuditEvent 
} = require('./secure-auth-middleware');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { method } = req;

    if (method === 'GET') {
      const { limit = 100, action, ip, userWallet } = req.query;
      
      let logs = getAuditLogs(parseInt(limit));
      
      // Filter logs if parameters provided
      if (action) {
        logs = logs.filter(log => log.action === action);
      }
      
      if (ip) {
        logs = logs.filter(log => log.ip.includes(ip));
      }
      
      if (userWallet) {
        logs = logs.filter(log => log.userWallet && log.userWallet.includes(userWallet));
      }
      
      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      logAuditEvent(req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown', 'GET', req.url, null, 'AUDIT_LOGS_VIEWED', { limit, filters: { action, ip, userWallet } });
      
      return res.json({
        success: true,
        logs,
        total: logs.length,
        filters: { action, ip, userWallet }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Audit logs API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
};
