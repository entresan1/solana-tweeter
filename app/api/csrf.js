const { 
  secureAuthMiddleware, 
  generateCSRFToken 
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
      // Generate and return CSRF token
      const csrfToken = generateCSRFToken();
      
      // Set token in both header and cookie for double-submit pattern
      res.setHeader('X-CSRF-Token', csrfToken);
      res.setHeader('X-XSRF-TOKEN', csrfToken);
      
      // Set cookie with SameSite=Lax for same-origin requests
      res.setHeader('Set-Cookie', `XSRF-TOKEN=${csrfToken}; Path=/; SameSite=Lax; HttpOnly=false; Secure=true`);
      
      console.log('🔐 CSRF token generated and sent:', csrfToken);
      
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
