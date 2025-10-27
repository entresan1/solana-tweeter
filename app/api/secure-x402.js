const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const crypto = require('crypto');
const config = require('./secure-config');

// Enhanced replay protection cache
const paymentCache = new Map();
const CACHE_CLEANUP_INTERVAL = 300000; // 5 minutes

// Clean up old cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of paymentCache.entries()) {
    if (now - value.timestamp > 3600000) { // 1 hour
      paymentCache.delete(key);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

class SecureX402Service {
  constructor() {
    this.connection = new Connection(config.solana.rpcUrl, 'confirmed');
    this.treasuryAddress = new PublicKey(config.solana.treasuryAddress);
  }
  
  /**
   * Create X402 payment request with enhanced security
   */
  createPaymentRequest(recipient = null, amount = null) {
    const targetRecipient = recipient || config.solana.treasuryAddress;
    const targetAmount = amount || config.x402.priceSOL;
    
    return {
      network: config.x402.network,
      recipient: targetRecipient,
      price: {
        token: 'SOL',
        amount: targetAmount
      },
      config: {
        description: `Payment of ${targetAmount} SOL to ${targetRecipient.slice(0, 8)}...`,
        expiresAt: Date.now() + 300000, // 5 minutes
        nonce: crypto.randomBytes(16).toString('hex')
      }
    };
  }
  
  /**
   * Enhanced payment verification with multiple security layers
   */
  async verifyPayment(proof, expectedRecipient = null, expectedAmount = null) {
    try {
      // Validate proof structure
      if (!this.validateProofStructure(proof)) {
        return { valid: false, error: 'Invalid proof structure' };
      }
      
      // Check for replay attacks with enhanced cache key
      const cacheKey = this.generateCacheKey(proof, expectedRecipient, expectedAmount);
      if (paymentCache.has(cacheKey)) {
        return { valid: false, error: 'Payment already processed (replay attack detected)' };
      }
      
      // Verify transaction exists and is confirmed
      const transaction = await this.connection.getTransaction(proof.transaction, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      if (!transaction) {
        return { valid: false, error: 'Transaction not found or not confirmed' };
      }
      
      // Verify transaction is recent (within 1 hour)
      const transactionTime = transaction.blockTime * 1000;
      const now = Date.now();
      if (now - transactionTime > 3600000) {
        return { valid: false, error: 'Transaction too old' };
      }
      
      // Verify transaction details
      const verification = await this.verifyTransactionDetails(
        transaction, 
        expectedRecipient || config.solana.treasuryAddress,
        expectedAmount || config.x402.priceSOL
      );
      
      if (!verification.valid) {
        return verification;
      }
      
      // Cache the payment to prevent replay
      paymentCache.set(cacheKey, {
        timestamp: now,
        transaction: proof.transaction,
        amount: verification.amount
      });
      
      return { valid: true, amount: verification.amount };
      
    } catch (error) {
      console.error('X402 verification error:', error);
      return { valid: false, error: 'Payment verification failed' };
    }
  }
  
  /**
   * Validate proof structure
   */
  validateProofStructure(proof) {
    if (!proof || typeof proof !== 'object') {
      return false;
    }
    
    const required = ['transaction', 'amount'];
    return required.every(field => proof[field] !== undefined);
  }
  
  /**
   * Generate enhanced cache key for replay protection
   */
  generateCacheKey(proof, recipient, amount) {
    const nonce = proof.nonce || 'default';
    const timestamp = proof.timestamp || Date.now();
    const recipientKey = recipient || config.solana.treasuryAddress;
    const amountKey = amount || config.x402.priceSOL;
    
    return crypto.createHash('sha256')
      .update(`${proof.transaction}-${amountKey}-${recipientKey}-${nonce}-${timestamp}`)
      .digest('hex');
  }
  
  /**
   * Verify transaction details
   */
  async verifyTransactionDetails(transaction, expectedRecipient, expectedAmount) {
    try {
      const expectedRecipientPubkey = new PublicKey(expectedRecipient);
      const expectedAmountLamports = Math.floor(expectedAmount * LAMPORTS_PER_SOL);
      
      // Check if transaction is a transfer
      if (!transaction.meta || !transaction.transaction) {
        return { valid: false, error: 'Invalid transaction structure' };
      }
      
      // Verify transaction succeeded
      if (transaction.meta.err) {
        return { valid: false, error: 'Transaction failed' };
      }
      
      // Check pre and post balances for SOL transfer
      const preBalances = transaction.meta.preBalances;
      const postBalances = transaction.meta.postBalances;
      
      if (!preBalances || !postBalances || preBalances.length !== postBalances.length) {
        return { valid: false, error: 'Invalid balance data' };
      }
      
      // Find the recipient account in the transaction
      const accountKeys = transaction.transaction.message.accountKeys;
      const recipientIndex = accountKeys.findIndex(key => 
        key.toString() === expectedRecipientPubkey.toString()
      );
      
      if (recipientIndex === -1) {
        return { valid: false, error: 'Recipient not found in transaction' };
      }
      
      // Calculate the amount transferred to recipient
      const balanceChange = postBalances[recipientIndex] - preBalances[recipientIndex];
      
      if (balanceChange < expectedAmountLamports) {
        return { 
          valid: false, 
          error: `Insufficient payment. Expected: ${expectedAmount} SOL, Received: ${balanceChange / LAMPORTS_PER_SOL} SOL` 
        };
      }
      
      return { 
        valid: true, 
        amount: balanceChange / LAMPORTS_PER_SOL 
      };
      
    } catch (error) {
      console.error('Transaction verification error:', error);
      return { valid: false, error: 'Transaction verification failed' };
    }
  }
  
  /**
   * Verify platform wallet payment
   */
  async verifyPlatformWalletPayment(proof, userWallet, amount) {
    // Generate expected platform wallet address
    const platformWalletAddress = this.generatePlatformWalletAddress(userWallet);
    return this.verifyPayment(proof, platformWalletAddress, amount);
  }
  
  /**
   * Generate platform wallet address (same as in platform-wallet-secure.js)
   */
  generatePlatformWalletAddress(userWallet) {
    const secretKey = config.platformWallet.secret;
    const salt = config.platformWallet.salt;
    
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(salt + userWallet);
    const hash = hmac.digest();
    
    // Use first 32 bytes as seed for keypair
    const seed = hash.slice(0, 32);
    const { Keypair } = require('@solana/web3.js');
    const keypair = Keypair.fromSeed(seed);
    
    return keypair.publicKey.toBase58();
  }
}

module.exports = new SecureX402Service();
