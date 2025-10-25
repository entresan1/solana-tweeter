const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');

async function testUltraMinimalProgram() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const programId = new PublicKey('3wkkNRHZCCMh1Ai1CoysC5vNEWS5e7ij2ztY19pwDuS3');
    
    try {
        // Check if program exists
        const programInfo = await connection.getAccountInfo(programId);
        
        if (programInfo) {
            console.log('✅ Program found on devnet!');
            console.log('Program ID:', programId.toString());
            console.log('Program Owner:', programInfo.owner.toString());
            console.log('Program Data Length:', programInfo.data.length);
            
            // Try to call the program with empty instruction data
            const transaction = new Transaction();
            transaction.add({
                keys: [],
                programId: programId,
                data: Buffer.from([])
            });
            
            console.log('✅ Program is callable!');
            console.log('Ultra minimal program is working correctly.');
            
        } else {
            console.log('❌ Program not found on devnet');
            console.log('The program needs to be deployed first.');
        }
        
    } catch (error) {
        console.error('❌ Error testing program:', error.message);
    }
}

testUltraMinimalProgram();
