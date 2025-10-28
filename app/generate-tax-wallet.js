const { Keypair } = require('@solana/web3.js');
const crypto = require('crypto');

// Generate a deterministic keypair for the tax wallet
// Using a specific seed for consistency
const seed = 'trench-beacon-tax-wallet-2024';
const seedBuffer = crypto.createHash('sha256').update(seed).digest();
const keypair = Keypair.fromSeed(seedBuffer);

console.log('🏦 TAX WALLET GENERATED');
console.log('========================');
console.log('Public Key (Address):', keypair.publicKey.toBase58());
console.log('Private Key (Base58):', Buffer.from(keypair.secretKey).toString('base64'));
console.log('Private Key (Array):', Array.from(keypair.secretKey));
console.log('');
console.log('🔐 SECURITY NOTES:');
console.log('- This is a DETERMINISTIC keypair (same every time)');
console.log('- Keep the private key SECURE and NEVER share it');
console.log('- This wallet will collect ALL platform fees');
console.log('- Add these to your environment variables:');
console.log('');
console.log('TAX_WALLET_ADDRESS=' + keypair.publicKey.toBase58());
console.log('TAX_WALLET_PRIVATE_KEY=' + Buffer.from(keypair.secretKey).toString('base64'));
console.log('');
console.log('💰 FUND THIS WALLET:');
console.log('- Send SOL to:', keypair.publicKey.toBase58());
console.log('- This wallet needs SOL for transaction fees');
console.log('- All platform fees will be sent here');
