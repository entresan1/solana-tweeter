const { Keypair, PublicKey, Connection, SystemProgram, LAMPORTS_PER_SOL, Transaction } = require('@solana/web3.js');

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Platform wallet service
const platformWalletService = {
  // Generate a deterministic keypair for a user based on their wallet address
  generatePlatformWallet(userWalletAddress) {
    // Create a deterministic seed from the user's wallet address using a simple hash
    // This is a simplified approach for browser compatibility
    const seed = new Uint8Array(32);
    const addressBytes = new TextEncoder().encode(userWalletAddress);
    
    // Simple deterministic seed generation
    for (let i = 0; i < 32; i++) {
      seed[i] = addressBytes[i % addressBytes.length] ^ (i * 7);
    }
    
    const keypair = Keypair.fromSeed(seed);
    return {
      keypair,
      address: keypair.publicKey.toBase58()
    };
  },

  // Get platform wallet address for a user
  getPlatformWalletAddress(userWalletAddress) {
    const { address } = this.generatePlatformWallet(userWalletAddress);
    return address;
  },

  // Get platform wallet keypair for a user
  getPlatformWalletKeypair(userWalletAddress) {
    const { keypair } = this.generatePlatformWallet(userWalletAddress);
    return keypair;
  },

  // Get platform wallet balance
  async getBalance(userWalletAddress) {
    try {
      const platformWalletAddress = this.getPlatformWalletAddress(userWalletAddress);
      const balance = await connection.getBalance(new PublicKey(platformWalletAddress));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting platform wallet balance:', error);
      return 0;
    }
  },

  // Transfer SOL from platform wallet to another address
  async transferFromPlatformWallet(fromUserAddress, toAddress, amount) {
    try {
      const platformKeypair = this.getPlatformWalletKeypair(fromUserAddress);
      const toPubkey = new PublicKey(toAddress);
      const lamports = amount * LAMPORTS_PER_SOL;

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: platformKeypair.publicKey,
        toPubkey: toPubkey,
        lamports: lamports,
      });

      // Create and sign transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: platformKeypair.publicKey,
      });

      transaction.add(transferInstruction);

      // Sign the transaction with the platform wallet keypair
      transaction.sign(platformKeypair);

      // Send the transaction
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      return {
        success: true,
        signature: signature,
        amount: amount
      };
    } catch (error) {
      console.error('Error transferring from platform wallet:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Send SOL from platform wallet (for beacons and tips)
  async sendFromPlatformWallet(fromUserAddress, toAddress, amount) {
    return this.transferFromPlatformWallet(fromUserAddress, toAddress, amount);
  }
};

module.exports = { platformWalletService };
