const crypto = require('crypto');

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP

// Audit logging
const auditLog = [];

// CSRF token storage
const csrfTokens = new Map();
const CSRF_TOKEN_TTL = 3600000; // 1 hour

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length
}

// Validate wallet address format
function validateWalletAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Rate limiting
function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requests = rateLimitMap.get(ip);
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  rateLimitMap.set(ip, validRequests);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitMap.set(ip, validRequests);
  
  return true;
}

// Generate CSRF token
function generateCSRFToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now();
  csrfTokens.set(token, timestamp);
  
  // Clean up old tokens
  for (const [t, ts] of csrfTokens.entries()) {
    if (now - ts > CSRF_TOKEN_TTL) {
      csrfTokens.delete(t);
    }
  }
  
  return token;
}

// Verify CSRF token
function verifyCSRFToken(token) {
  if (!token || !csrfTokens.has(token)) return false;
  
  const timestamp = csrfTokens.get(token);
  const now = Date.now();
  
  if (now - timestamp > CSRF_TOKEN_TTL) {
    csrfTokens.delete(token);
    return false;
  }
  
  return true;
}

// Audit logging
function logAuditEvent(ip, method, endpoint, userWallet, action, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip,
    method,
    endpoint,
    userWallet: userWallet ? userWallet.slice(0, 8) + '...' : 'anonymous',
    action,
    details,
    id: crypto.randomUUID()
  };
  
  auditLog.push(logEntry);
  
  // Keep only last 1000 entries to prevent memory issues
  if (auditLog.length > 1000) {
    auditLog.splice(0, auditLog.length - 1000);
  }
  
  console.log('🔍 AUDIT:', JSON.stringify(logEntry));
}

// Main authentication middleware
function secureAuthMiddleware(req, res, next) {
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   'unknown';
  
  const method = req.method;
  const endpoint = req.url;
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Rate limiting
  if (!checkRateLimit(clientIP)) {
    logAuditEvent(clientIP, method, endpoint, null, 'RATE_LIMIT_EXCEEDED');
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
    });
  }
  
  // Input sanitization for all inputs
  if (req.body) {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeInput(value);
      }
    }
  }
  
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeInput(value);
      }
    }
  }
  
  // CSRF protection for state-changing operations
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const csrfToken = req.headers['x-csrf-token'];
    
    if (!csrfToken || !verifyCSRFToken(csrfToken)) {
      logAuditEvent(clientIP, method, endpoint, null, 'CSRF_TOKEN_INVALID');
      return res.status(403).json({
        error: 'CSRF Token Required',
        message: 'Invalid or missing CSRF token for this operation.'
      });
    }
  }
  
  // Extract user wallet from request (if available)
  const userWallet = req.body?.userWallet || req.query?.userWallet || req.body?.walletAddress || req.query?.walletAddress;
  
  // Validate wallet address if provided
  if (userWallet && !validateWalletAddress(userWallet)) {
    logAuditEvent(clientIP, method, endpoint, userWallet, 'INVALID_WALLET_ADDRESS');
    return res.status(400).json({
      error: 'Invalid Wallet Address',
      message: 'The provided wallet address is not valid.'
    });
  }
  
  // Log the request
  logAuditEvent(clientIP, method, endpoint, userWallet, 'REQUEST_RECEIVED');
  
  // Add security context to request
  req.securityContext = {
    ip: clientIP,
    userWallet,
    timestamp: Date.now()
  };
  
  // Add CSRF token to response for future requests
  if (method === 'GET') {
    const csrfToken = generateCSRFToken();
    res.setHeader('X-CSRF-Token', csrfToken);
  }
  
  next();
}

// Get audit logs (for debugging/monitoring)
function getAuditLogs(limit = 100) {
  return auditLog.slice(-limit);
}

// Clear old audit logs
function clearOldAuditLogs() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const filtered = auditLog.filter(entry => 
    new Date(entry.timestamp).getTime() > oneDayAgo
  );
  auditLog.length = 0;
  auditLog.push(...filtered);
}

// Clean up old data every hour
setInterval(() => {
  clearOldAuditLogs();
  
  // Clean up old rate limit data
  const now = Date.now();
  for (const [ip, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    if (validRequests.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, validRequests);
    }
  }
  
  // Clean up old CSRF tokens
  for (const [token, timestamp] of csrfTokens.entries()) {
    if (now - timestamp > CSRF_TOKEN_TTL) {
      csrfTokens.delete(token);
    }
  }
}, 3600000); // Every hour

module.exports = {
  secureAuthMiddleware,
  sanitizeInput,
  validateWalletAddress,
  logAuditEvent,
  getAuditLogs,
  generateCSRFToken,
  verifyCSRFToken
};
