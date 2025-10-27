import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from 'solana-wallets-vue';

/**
 * Optimized X402 client that reduces API calls and improves performance
 */
class OptimizedX402Client {
  private static instance: OptimizedX402Client;
  private connection: Connection;
  private paymentCache = new Map<string, { timestamp: number; proof: any }>();
  private readonly CACHE_DURATION = 300000; // 5 minutes

  private constructor() {
    this.connection = new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  public static getInstance(): OptimizedX402Client {
    if (!OptimizedX402Client.instance) {
      OptimizedX402Client.instance = new OptimizedX402Client();
    }
    return OptimizedX402Client.instance;
  }

  /**
   * Create and send a beacon with optimized payment flow
   */
  async sendBeacon(content: string, topic?: string, authorDisplay?: string): Promise<any> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Check if we have a recent payment for this user
    const userAddress = wallet.value.publicKey.toString();
    const cachedPayment = this.getCachedPayment(userAddress, 'beacon');
    
    if (cachedPayment) {
      console.log('🚀 Using cached payment for beacon');
      return this.sendBeaconWithProof(content, topic, authorDisplay, cachedPayment);
    }

    // Create new payment
    const paymentTx = await this.createPaymentTransaction(0.001);
    const signature = await this.sendTransaction(paymentTx);
    
    const proof = {
      transaction: signature,
      amount: 0.001,
      nonce: crypto.getRandomValues(new Uint8Array(16)).join(''),
      timestamp: Date.now()
    };

    // Cache the payment
    this.cachePayment(userAddress, 'beacon', proof);

    return this.sendBeaconWithProof(content, topic, authorDisplay, proof);
  }

  /**
   * Send beacon with existing proof
   */
  private async sendBeaconWithProof(
    content: string, 
    topic?: string, 
    authorDisplay?: string, 
    proof?: any
  ): Promise<any> {
    const endpoint = '/api/beacon-secure';
    const payload = {
      content,
      topic,
      author_display: authorDisplay,
      platform_wallet: false
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (proof) {
      headers['x-402-proof'] = JSON.stringify(proof);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Send tip with optimized payment flow
   */
  async sendTip(recipient: string, amount: number, message: string, beaconId?: number): Promise<any> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const userAddress = wallet.value.publicKey.toString();
    const cacheKey = `tip_${recipient}_${amount}`;
    const cachedPayment = this.getCachedPayment(userAddress, cacheKey);
    
    if (cachedPayment) {
      console.log('🚀 Using cached payment for tip');
      return this.sendTipWithProof(recipient, amount, message, beaconId, cachedPayment);
    }

    // Create new payment
    const paymentTx = await this.createPaymentTransaction(amount);
    const signature = await this.sendTransaction(paymentTx);
    
    const proof = {
      transaction: signature,
      amount,
      nonce: crypto.getRandomValues(new Uint8Array(16)).join(''),
      timestamp: Date.now()
    };

    // Cache the payment
    this.cachePayment(userAddress, cacheKey, proof);

    return this.sendTipWithProof(recipient, amount, message, beaconId, proof);
  }

  /**
   * Send tip with existing proof
   */
  private async sendTipWithProof(
    recipient: string,
    amount: number,
    message: string,
    beaconId?: number,
    proof?: any
  ): Promise<any> {
    const endpoint = '/api/tip-secure';
    const payload = {
      recipient,
      amount,
      message,
      beacon_id: beaconId,
      platform_wallet: false
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (proof) {
      headers['x-402-proof'] = JSON.stringify(proof);
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Deposit to platform wallet with optimized flow
   */
  async depositToPlatformWallet(amount: number): Promise<any> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const userAddress = wallet.value.publicKey.toString();
    const platformWalletAddress = this.generatePlatformWalletAddress(userAddress);
    
    // Check cache
    const cacheKey = `deposit_${amount}`;
    const cachedPayment = this.getCachedPayment(userAddress, cacheKey);
    
    if (cachedPayment) {
      console.log('🚀 Using cached payment for deposit');
      return this.depositWithProof(platformWalletAddress, amount, cachedPayment);
    }

    // Create new payment
    const paymentTx = await this.createPaymentTransaction(amount);
    const signature = await this.sendTransaction(paymentTx);
    
    const proof = {
      transaction: signature,
      amount,
      nonce: crypto.getRandomValues(new Uint8Array(16)).join(''),
      timestamp: Date.now()
    };

    // Cache the payment
    this.cachePayment(userAddress, cacheKey, proof);

    return this.depositWithProof(platformWalletAddress, amount, proof);
  }

  /**
   * Deposit with existing proof
   */
  private async depositWithProof(
    platformWalletAddress: string,
    amount: number,
    proof: any
  ): Promise<any> {
    const endpoint = '/api/platform-deposit-secure';
    const payload = {
      recipient: platformWalletAddress,
      amount,
      user: this.getCurrentUserAddress(),
      platform_wallet: true
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-402-proof': JSON.stringify(proof)
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create payment transaction
   */
  private async createPaymentTransaction(amount: number): Promise<Transaction> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const treasuryAddress = new PublicKey('YOUR_TREASURY_ADDRESS'); // Replace with actual
    const transaction = new Transaction();
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.value.publicKey,
        toPubkey: treasuryAddress,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL)
      })
    );

    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.value.publicKey;

    return transaction;
  }

  /**
   * Send transaction and return signature
   */
  private async sendTransaction(transaction: Transaction): Promise<string> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.adapter?.sendTransaction) {
      throw new Error('Wallet does not support sending transactions');
    }

    const signature = await wallet.value.adapter.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature);
    
    return signature;
  }

  /**
   * Generate platform wallet address
   */
  private generatePlatformWalletAddress(userWallet: string): string {
    // This would use the same logic as the server
    // For now, return a placeholder
    return 'PLATFORM_WALLET_ADDRESS';
  }

  /**
   * Get current user address
   */
  private getCurrentUserAddress(): string {
    const { wallet } = useWallet();
    return wallet.value?.publicKey?.toString() || '';
  }

  /**
   * Cache payment proof
   */
  private cachePayment(userAddress: string, type: string, proof: any) {
    const key = `${userAddress}_${type}`;
    this.paymentCache.set(key, {
      timestamp: Date.now(),
      proof
    });
  }

  /**
   * Get cached payment proof
   */
  private getCachedPayment(userAddress: string, type: string): any | null {
    const key = `${userAddress}_${type}`;
    const cached = this.paymentCache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.paymentCache.delete(key);
      return null;
    }
    
    return cached.proof;
  }

  /**
   * Clear cache for user
   */
  clearUserCache(userAddress: string) {
    for (const [key] of this.paymentCache) {
      if (key.startsWith(userAddress)) {
        this.paymentCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const optimizedX402Client = OptimizedX402Client.getInstance();
