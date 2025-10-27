const crypto = require('crypto');

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP

// Wallet address validation
function validateWalletAddress(address) {
  if (!address || typeof address !== 'string') return false;
  // Basic Solana address validation (base58, 32-44 characters)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

// Audit logging
const auditLog = [];

// CSRF token storage
const csrfTokens = new Map();
const CSRF_TOKEN_TTL = 3600000; // 1 hour

// Input sanitization
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // For base64 data URLs, don't apply length limits as they can be very long
  if (input.startsWith('data:image/')) {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length for regular inputs
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
  
  console.log('🔐 Generated CSRF token:', token);
  console.log('🔐 Total tokens in storage:', csrfTokens.size);
  console.log('🔐 All stored tokens:', Array.from(csrfTokens.keys()));
  
  // Clean up old tokens
  const now = Date.now();
  for (const [t, ts] of csrfTokens.entries()) {
    if (now - ts > CSRF_TOKEN_TTL) {
      csrfTokens.delete(t);
    }
  }
  
  return token;
}

// Verify CSRF token
function verifyCSRFToken(token) {
  console.log('🔐 Verifying CSRF token:', token);
  console.log('🔐 Token exists in storage:', csrfTokens.has(token));
  console.log('🔐 Available tokens:', Array.from(csrfTokens.keys()));
  
  if (!token || !csrfTokens.has(token)) {
    console.log('❌ Token not found in storage');
    return false;
  }
  
  const timestamp = csrfTokens.get(token);
  const now = Date.now();
  const age = now - timestamp;
  
  console.log('🔐 Token age:', age, 'ms (TTL:', CSRF_TOKEN_TTL, 'ms)');
  
  if (age > CSRF_TOKEN_TTL) {
    console.log('❌ Token expired, removing from storage');
    csrfTokens.delete(token);
    return false;
  }
  
  console.log('✅ CSRF token is valid');
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

// Parse cookies from request headers
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });
  }
  return cookies;
}

// Main authentication middleware
function secureAuthMiddleware(req, res, next) {
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   'unknown';
  
  const method = req.method;
  const endpoint = req.url;
  
  // Parse cookies from headers if not already parsed
  if (!req.cookies) {
    req.cookies = parseCookies(req.headers.cookie);
  }
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers - SECURITY: Restrict to specific origins
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
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-XSRF-TOKEN, X-Requested-With, X-Wallet-Address, X-Wallet-Signature');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
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
  
  // CSRF protection for state-changing operations (disabled for like/reply)
  const isLikeOrReply = endpoint.includes('/beacon-interactions') || endpoint.includes('/beacon-replies');
  
  if (isLikeOrReply) {
    console.log('🔓 CSRF protection disabled for like/reply operations:', endpoint);
  }
  
  if (['POST', 'PUT', 'DELETE'].includes(method) && req.body && Object.keys(req.body).length > 0 && !isLikeOrReply) {
    // Check for CSRF token in multiple header formats
    const csrfToken = req.headers['x-csrf-token'] || 
                     req.headers['X-CSRF-Token'] || 
                     req.headers['x-xsrf-token'] || 
                     req.headers['X-XSRF-TOKEN'] ||
                     req.headers['csrf-token'] ||
                     req.headers['CSRF-Token'];
    
    // Also check for double-submit cookie pattern
    const cookieToken = req.cookies?.XSRF_TOKEN || req.cookies?.xsrf_token || req.cookies?.csrfToken;
    
    console.log('🔐 CSRF validation for', method, endpoint);
    console.log('🔐 Received token from header:', csrfToken);
    console.log('🔐 Received token from cookie:', cookieToken);
    console.log('🔐 Available tokens:', Array.from(csrfTokens.keys()));
    console.log('🔐 All headers:', Object.keys(req.headers).filter(h => h.toLowerCase().includes('csrf')));
    console.log('🔐 All cookies:', Object.keys(req.cookies || {}));
    console.log('🔐 Request body:', JSON.stringify(req.body, null, 2));
    
    // Verify either header token or cookie token matches stored token
    const isValidToken = (csrfToken && verifyCSRFToken(csrfToken)) || 
                        (cookieToken && verifyCSRFToken(cookieToken));
    
    if (!isValidToken) {
      console.log('❌ CSRF token validation failed');
      logAuditEvent(clientIP, method, endpoint, null, 'CSRF_TOKEN_INVALID');
      return res.status(403).json({
        error: 'CSRF Token Required',
        message: 'Invalid or missing CSRF token for this operation.'
      });
    }
    
    console.log('✅ CSRF token validation passed');
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
    
    // Set double-submit cookie for client-side access using Set-Cookie header
    const cookieOptions = [
      `XSRF-TOKEN=${csrfToken}`,
      'HttpOnly=false',
      'SameSite=Lax',
      'Path=/'
    ];
    
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.push('Secure');
    }
    
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
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
