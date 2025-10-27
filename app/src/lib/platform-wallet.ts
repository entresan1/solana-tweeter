import { Keypair, PublicKey, Connection, SystemProgram, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';

// Solana connection
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Platform wallet service
export const platformWalletService = {
  // Generate a deterministic keypair for a user based on their wallet address
  generatePlatformWallet(userWalletAddress: string): { keypair: Keypair; address: string } {
    // Create a deterministic seed from the user's wallet address using a simple hash
    // This is a simplified approach for browser compatibility
    const seed = new Uint8Array(32);
    const addressBytes = new TextEncoder().encode(userWalletAddress);
    
    // Simple deterministic seed generation
    for (let i = 0; i < 32; i++) {
      seed[i] = addressBytes[i % addressBytes.length] ^ (i * 7);
    }
    
    // Generate keypair from seed
    const keypair = Keypair.fromSeed(seed);
    
    return {
      keypair,
      address: keypair.publicKey.toBase58()
    };
  },

  // Get platform wallet balance
  async getBalance(userWalletAddress: string): Promise<number> {
    try {
      const { address } = this.generatePlatformWallet(userWalletAddress);
      const balance = await connection.getBalance(new PublicKey(address));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting platform wallet balance:', error);
      return 0;
    }
  },

  // Check if platform wallet has sufficient balance
  async hasSufficientBalance(userWalletAddress: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance(userWalletAddress);
    return balance >= requiredAmount;
  },

  // Send SOL from platform wallet (no user approval needed)
  async sendFromPlatformWallet(
    userWalletAddress: string,
    recipientAddress: string,
    amount: number
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const { keypair } = this.generatePlatformWallet(userWalletAddress);
      const recipient = new PublicKey(recipientAddress);
      const lamports = amount * LAMPORTS_PER_SOL;

      // Check balance first
      const balance = await this.getBalance(userWalletAddress);
      if (balance < amount) {
        return {
          success: false,
          error: `Insufficient balance. Required: ${amount} SOL, Available: ${balance.toFixed(6)} SOL`
        };
      }

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: recipient,
        lamports,
      });

      // Create and sign transaction
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: keypair.publicKey,
      });

      transaction.add(transferInstruction);

      // Sign with platform wallet (no user interaction needed)
      transaction.sign(keypair);

      // Send transaction
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      return {
        success: true,
        signature
      };
    } catch (error: any) {
      console.error('Error sending from platform wallet:', error);
      return {
        success: false,
        error: error.message || 'Transaction failed'
      };
    }
  },

  // Get platform wallet address for display
  getPlatformWalletAddress(userWalletAddress: string): string {
    const { address } = this.generatePlatformWallet(userWalletAddress);
    return address;
  }
};
