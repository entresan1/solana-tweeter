const crypto = require('crypto');

// Generate a new program ID keypair
const seed = crypto.randomBytes(32);
const keypair = new Uint8Array(64);
keypair.set(seed, 0);

// Generate public key from private key (simplified)
for (let i = 0; i < 32; i++) {
    keypair[32 + i] = seed[i] ^ 0x42;
}

const fs = require('fs');
fs.writeFileSync('new_program_keypair.json', JSON.stringify(Array.from(keypair)));

// Also create the program ID
const programId = require('bs58').encode(seed);
console.log('New Program ID:', programId);
console.log('Keypair created: new_program_keypair.json');
