const crypto = require('crypto');

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

/**
 * Secure rate limiting with IP-based tracking
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const key = `rate_limit_${ip}`;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }
  
  const requests = rateLimitStore.get(key);
  const validRequests = requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitStore.set(key, validRequests);
  return true;
}

/**
 * Validate wallet signature for authentication
 */
function validateWalletSignature(signature, message, publicKey) {
  try {
    // In a real implementation, you would verify the signature against the message
    // For now, we'll do basic validation
    if (!signature || !message || !publicKey) {
      return false;
    }
    
    // Basic format validation
    if (typeof signature !== 'string' || signature.length < 80) {
      return false;
    }
    
    if (typeof publicKey !== 'string' || publicKey.length !== 44) {
      return false;
    }
    
    // In production, use @solana/web3.js to verify the signature
    // const { PublicKey, verify } = require('@solana/web3.js');
    // const pubKey = new PublicKey(publicKey);
    // return verify(new TextEncoder().encode(message), Buffer.from(signature, 'base64'), pubKey);
    
    return true; // Placeholder - implement real signature verification
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Sanitize input to prevent SQL injection and XSS
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .replace(/[;]/g, '') // Remove semicolons
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validate required fields with proper sanitization
 */
function validateRequiredFields(body, requiredFields) {
  const errors = [];
  const sanitized = {};
  
  for (const field of requiredFields) {
    if (!body[field]) {
      errors.push(`${field} is required`);
    } else {
      sanitized[field] = sanitizeInput(body[field]);
    }
  }
  
  return { isValid: errors.length === 0, errors, sanitized };
}

/**
 * Secure CORS configuration
 */
function setSecureCORSHeaders(res) {
  const allowedOrigins = [
    'https://trenchbeacon.com',
    'https://www.trenchbeacon.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  const origin = res.req?.headers?.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://trenchbeacon.com');
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-402-proof,wallet-signature,wallet-message,wallet-public-key');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Secure error response without information disclosure
 */
function sendSecureError(res, statusCode, message, logError = null) {
  if (logError) {
    console.error('API Error:', logError);
  }
  
  // Don't expose internal errors to client
  const safeMessage = statusCode >= 500 ? 'Internal Server Error' : message;
  
  res.status(statusCode).json({
    error: true,
    message: safeMessage,
    timestamp: new Date().toISOString()
  });
}

/**
 * Main authentication middleware
 */
function authMiddleware(req, res, next) {
  // Set secure CORS headers
  setSecureCORSHeaders(res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Rate limiting
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   'unknown';
  
  if (!checkRateLimit(clientIP)) {
    return sendSecureError(res, 429, 'Too many requests. Please try again later.');
  }
  
  // For POST requests, require wallet authentication
  if (req.method === 'POST') {
    const signature = req.headers['wallet-signature'];
    const message = req.headers['wallet-message'];
    const publicKey = req.headers['wallet-public-key'];
    
    if (!signature || !message || !publicKey) {
      return sendSecureError(res, 401, 'Wallet authentication required');
    }
    
    if (!validateWalletSignature(signature, message, publicKey)) {
      return sendSecureError(res, 401, 'Invalid wallet signature');
    }
    
    // Add authenticated user to request
    req.authenticatedUser = {
      publicKey,
      signature,
      message
    };
  }
  
  next();
}

module.exports = {
  authMiddleware,
  validateWalletSignature,
  sanitizeInput,
  validateRequiredFields,
  setSecureCORSHeaders,
  sendSecureError,
  checkRateLimit
};
