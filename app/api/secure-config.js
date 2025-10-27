/**
 * Secure configuration management
 * All sensitive data should be loaded from environment variables
 */

// Validate required environment variables
function validateEnvironment() {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'PLATFORM_WALLET_SECRET',
    'PLATFORM_WALLET_SALT',
    'TREASURY_SOL_ADDRESS'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Secure configuration object
const config = {
  // Database configuration
  supabase: {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  },
  
  // Solana configuration
  solana: {
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    network: process.env.SOLANA_NETWORK || 'mainnet-beta',
    treasuryAddress: process.env.TREASURY_SOL_ADDRESS
  },
  
  // Platform wallet security
  platformWallet: {
    secret: process.env.PLATFORM_WALLET_SECRET,
    salt: process.env.PLATFORM_WALLET_SALT,
    minSecretLength: 32
  },
  
  // X402 configuration
  x402: {
    priceSOL: parseFloat(process.env.X402_PRICE_SOL || '0.001'),
    network: process.env.X402_NETWORK || 'solana',
    facilitatorUrl: process.env.X402_FACILITATOR_URL
  },
  
  // Security settings
  security: {
    maxContentLength: 1000,
    maxMessageLength: 500,
    maxTopicLength: 50,
    rateLimitWindow: 60000, // 1 minute
    rateLimitMaxRequests: 10,
    sessionTimeout: 3600000 // 1 hour
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: [
      'https://trenchbeacon.com',
      'https://www.trenchbeacon.com',
      'http://localhost:3000',
      'http://localhost:5173'
    ]
  }
};

// Validate configuration on load
try {
  validateEnvironment();
  console.log('✅ Configuration validated successfully');
} catch (error) {
  console.error('❌ Configuration validation failed:', error.message);
  process.exit(1);
}

// Sanitize and validate configuration values
function sanitizeConfig() {
  // Ensure platform wallet secret is long enough
  if (config.platformWallet.secret.length < config.platformWallet.minSecretLength) {
    throw new Error('PLATFORM_WALLET_SECRET must be at least 32 characters long');
  }
  
  // Validate treasury address format
  if (!config.solana.treasuryAddress || config.solana.treasuryAddress.length !== 44) {
    throw new Error('TREASURY_SOL_ADDRESS must be a valid Solana address');
  }
  
  // Validate X402 price
  if (config.x402.priceSOL <= 0 || config.x402.priceSOL > 1) {
    throw new Error('X402_PRICE_SOL must be between 0 and 1');
  }
}

// Apply sanitization
try {
  sanitizeConfig();
} catch (error) {
  console.error('❌ Configuration sanitization failed:', error.message);
  process.exit(1);
}

module.exports = config;
