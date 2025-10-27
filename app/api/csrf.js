const { 
  secureAuthMiddleware
} = require('./secure-auth-middleware');

module.exports = async (req, res) => {
  // Apply security middleware
  secureAuthMiddleware(req, res, () => {
    handleRequest(req, res);
  });
};

async function handleRequest(req, res) {
  try {
    const { method } = req;
    
    if (method === 'GET') {
      // The middleware already generated a token and set it in the response headers
      // We just need to return it in the response body
      const csrfToken = res.getHeader('X-CSRF-Token');
      
      console.log('🔐 CSRF token from middleware:', csrfToken);
      
      return res.json({ 
        success: true, 
        token: csrfToken,
        message: 'CSRF token generated successfully'
      });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('❌ CSRF endpoint error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to generate CSRF token'
    });
  }
}
