# Environment Variables Configuration

## Required Environment Variables

Create a `.env` file in the `app` directory with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
TREASURY_SOL_ADDRESS=your_treasury_address_here

# Platform Wallet Security (CRITICAL - Use strong, unique values)
PLATFORM_WALLET_SECRET=your_very_long_secret_key_at_least_32_characters_long
PLATFORM_WALLET_SALT=your_unique_salt_value_here

# X402 Configuration
X402_PRICE_SOL=0.001
X402_NETWORK=solana
X402_FACILITATOR_URL=your_x402_facilitator_url_here

# API Configuration
VITE_API_URL=https://your-domain.com

# Security Settings
NODE_ENV=production
```

## Security Notes

1. **PLATFORM_WALLET_SECRET**: Must be at least 32 characters long, use a cryptographically secure random string
2. **PLATFORM_WALLET_SALT**: Use a unique salt value, different from the secret
3. **TREASURY_SOL_ADDRESS**: Your actual Solana treasury wallet address
4. **Never commit these values to version control**

## Generating Secure Values

```bash
# Generate a secure secret (32+ characters)
openssl rand -hex 32

# Generate a secure salt
openssl rand -hex 16
```
