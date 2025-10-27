import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { useWallet } from 'solana-wallets-vue';

/**
 * Secure API client with proper authentication and error handling
 */
export class SecureAPIClient {
  private baseUrl: string;
  private connection: Connection;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '';
    this.connection = new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  /**
   * Create authenticated headers for API requests
   */
  private async createAuthHeaders(message: string): Promise<Record<string, string>> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // In a real implementation, you would sign the message with the wallet
    // For now, we'll create a mock signature
    const signature = await this.signMessage(message);
    
    return {
      'Content-Type': 'application/json',
      'wallet-signature': signature,
      'wallet-message': message,
      'wallet-public-key': wallet.value.publicKey.toString()
    };
  }

  /**
   * Sign a message with the connected wallet
   */
  private async signMessage(message: string): Promise<string> {
    const { wallet } = useWallet();
    
    if (!wallet.value || !(wallet.value as any).adapter?.signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    const encodedMessage = new TextEncoder().encode(message);
    const signature = await (wallet.value as any).adapter.signMessage(encodedMessage);
    
    return Buffer.from(signature).toString('base64');
  }

  /**
   * Create X402 payment proof
   */
  private async createX402Proof(transaction: string, amount: number): Promise<any> {
    return {
      transaction,
      amount,
      nonce: crypto.getRandomValues(new Uint8Array(16)).join(''),
      timestamp: Date.now()
    };
  }

  /**
   * Send authenticated API request
   */
  private async sendRequest(
    endpoint: string, 
    method: string, 
    body?: any, 
    requiresPayment: boolean = false
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const message = `API Request: ${method} ${endpoint} at ${Date.now()}`;
    
    const headers = await this.createAuthHeaders(message);
    
    if (requiresPayment && body) {
      // Add X402 proof for payment-required endpoints
      const proof = await this.createX402Proof(body.transaction || 'mock', body.amount || 0.001);
      headers['x-402-proof'] = JSON.stringify(proof);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a beacon with payment
   */
  async createBeacon(content: string, topic?: string, authorDisplay?: string): Promise<any> {
    // First, create payment transaction
    const paymentTx = await this.createPaymentTransaction(0.001);
    const signature = await this.sendTransaction(paymentTx);
    
    const body = {
      content,
      topic,
      author_display: authorDisplay,
      transaction: signature,
      amount: 0.001
    };

    return this.sendRequest('/api/beacon-secure', 'POST', body, true);
  }

  /**
   * Send a tip with payment
   */
  async sendTip(recipient: string, amount: number, message: string, beaconId?: number): Promise<any> {
    // First, create payment transaction
    const paymentTx = await this.createPaymentTransaction(amount);
    const signature = await this.sendTransaction(paymentTx);
    
    const body = {
      recipient,
      amount,
      message,
      beacon_id: beaconId,
      transaction: signature
    };

    return this.sendRequest('/api/tip-secure', 'POST', body, true);
  }

  /**
   * Deposit to platform wallet
   */
  async depositToPlatformWallet(recipient: string, amount: number): Promise<any> {
    // First, create payment transaction
    const paymentTx = await this.createPaymentTransaction(amount);
    const signature = await this.sendTransaction(paymentTx);
    
    const body = {
      recipient,
      amount,
      user: await this.getCurrentUserAddress(),
      transaction: signature
    };

    return this.sendRequest('/api/platform-deposit-secure', 'POST', body, true);
  }

  /**
   * Withdraw from platform wallet
   */
  async withdrawFromPlatformWallet(amount: number): Promise<any> {
    const body = {
      user: await this.getCurrentUserAddress(),
      amount
    };

    return this.sendRequest('/api/platform-withdraw-secure', 'POST', body);
  }

  /**
   * Get recent tips
   */
  async getRecentTips(limit: number = 20): Promise<any> {
    return this.sendRequest(`/api/recent-tips-secure?limit=${limit}`, 'GET');
  }

  /**
   * Create payment transaction
   */
  private async createPaymentTransaction(amount: number): Promise<Transaction> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    const treasuryAddress = new PublicKey('YOUR_TREASURY_ADDRESS'); // Replace with actual treasury address
    const transaction = new Transaction();
    
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.value.publicKey,
        toPubkey: treasuryAddress,
        lamports: Math.floor(amount * 1000000000) // Convert SOL to lamports
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
    
    if (!wallet.value || !(wallet.value as any).adapter?.sendTransaction) {
      throw new Error('Wallet does not support sending transactions');
    }

    const signature = await (wallet.value as any).adapter.sendTransaction(transaction, this.connection);
    await this.connection.confirmTransaction(signature);
    
    return signature;
  }

  /**
   * Get current user address
   */
  private async getCurrentUserAddress(): Promise<string> {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    return wallet.value.publicKey.toString();
  }
}

// Export singleton instance
export const secureAPIClient = new SecureAPIClient();
