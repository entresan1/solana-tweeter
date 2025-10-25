const fs = require('fs');
const crypto = require('crypto');

// Generate a random 32-byte seed
const seed = crypto.randomBytes(32);

// Create a keypair (64 bytes: 32 private + 32 public)
const keypair = new Uint8Array(64);
keypair.set(seed, 0);

// Generate public key from private key (simplified - in reality you'd use proper Ed25519)
for (let i = 0; i < 32; i++) {
    keypair[32 + i] = seed[i] ^ 0x42; // Simple transformation for demo
}

try {
    const keypairPath = 'program-keypair.json';
    
    // Write as JSON array
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair)));
    console.log('Program keypair created successfully at:', keypairPath);
    console.log('Keypair length:', keypair.length);
} catch (error) {
    console.error('Error creating program keypair:', error.message);
}