const { Keypair } = require('@solana/web3.js');

// Example user wallet address
const userWalletAddress = 'EZ1tDSNsMSCUeYmcNVGEj5XibdyVJGeiF2okTfyd8eaV';

// Generate platform wallet for this user
const seed = new Uint8Array(32);
const addressBytes = new TextEncoder().encode(userWalletAddress);

// Simple deterministic seed generation (same as in platform-wallet.ts)
for (let i = 0; i < 32; i++) {
  seed[i] = addressBytes[i % addressBytes.length] ^ (i * 7);
}

const keypair = Keypair.fromSeed(seed);

console.log('🔑 PLATFORM WALLET KEYS');
console.log('========================');
console.log('User Wallet:', userWalletAddress);
console.log('Platform Wallet Address:', keypair.publicKey.toBase58());
console.log('');
console.log('Private Key Formats:');
console.log('Base64:', Buffer.from(keypair.secretKey).toString('base64'));
console.log('Array:', Array.from(keypair.secretKey));
console.log('Hex:', Buffer.from(keypair.secretKey).toString('hex'));
console.log('');
console.log('✅ Use Base64 format for copying to clipboard');
