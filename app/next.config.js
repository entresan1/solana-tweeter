/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false, // Use pages directory
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  env: {
    X402_NETWORK: 'solana',
    X402_PRICE_SOL: '0.01',
    // Add your facilitator URL here when available
    // X402_FACILITATOR_URL: 'your-facilitator-url-here',
  },
};

module.exports = nextConfig;
