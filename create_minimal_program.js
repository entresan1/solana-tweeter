const fs = require('fs');

// Create a minimal Solana program binary
// This is a simplified approach - in reality we'd need to compile properly
const minimalProgram = Buffer.alloc(1024); // 1KB minimal program
minimalProgram.write('SOLANA_PROGRAM', 0);

fs.writeFileSync('minimal_program.so', minimalProgram);
console.log('Created minimal program binary');
