import { TweetModel } from '@src/models/tweet.model';
import { useWorkspace } from '@src/hooks';
import { PublicKey } from '@solana/web3.js';
import { sendBeaconWithPayment } from '@src/lib/x402-client';

export const sendTweet = async (topic: string, content: string, usePlatformWallet: boolean = false) => {
  const { wallet } = useWorkspace();

  try {
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('🚀 Sending beacon with x402 payment...', { usePlatformWallet });
    
    if (usePlatformWallet) {
      // Use platform wallet for beacon creation
      const { sendBeaconWithPlatformWallet } = await import('@src/lib/x402-platform-client');
      const response = await sendBeaconWithPlatformWallet(topic, content, wallet.value.publicKey.toBase58());
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to send beacon with platform wallet');
      }
      
      console.log('✅ Beacon sent successfully with platform wallet:', response);
      
      // Create a mock PublicKey for compatibility
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = 1; // Mark as beacon
      mockKeyBytes[31] = 0x42; // Mark as beacon
      
      return {
        id: response.beacon?.id || Date.now(),
        topic: topic,
        content: content,
        author: new PublicKey(mockKeyBytes),
        authorDisplay: wallet.value.publicKey.toBase58().slice(0, 8) + '...',
        timestamp: Date.now(),
        treasuryTransaction: response.payment?.transaction || 'platform-wallet-tx',
        platformWallet: true
      } as TweetModel;
    } else {
      // Use x402 client to send beacon with automatic payment
      const response = await sendBeaconWithPayment(topic, content, wallet.value);
    
    if (!response.success) {
      throw new Error(response.message || 'Failed to send beacon');
    }

    console.log('✅ Beacon sent successfully:', response);

    // Create a mock PublicKey for compatibility
    const mockKeyBytes = new Uint8Array(32);
    mockKeyBytes.fill(0);
    mockKeyBytes[0] = 1; // Mark as beacon
    mockKeyBytes[31] = 0x42; // Mark as beacon
    
    // Return a proper TweetModel instance
    const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
      author: wallet.value.publicKey,
      timestamp: { toNumber: () => Date.now() / 1000 },
      topic,
      content,
      treasuryTransaction: response.payment?.transaction || 'unknown',
      author_display: wallet.value.publicKey.toBase58().slice(0, 8) + '...'
    });
    
    console.log('✅ Created TweetModel for new beacon:', tweetModel);
    return tweetModel;
  } catch (error: any) {
    console.error('Send beacon error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
      throw new Error('Transaction was cancelled by user');
    } else if (error.message?.includes('Payment Required') || error.message?.includes('402')) {
      throw new Error('Payment verification failed. Please try again.');
    } else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient')) {
      throw new Error('Insufficient SOL balance. Please add funds to your wallet.');
    } else if (error.message?.includes('network') || error.message?.includes('connection')) {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.message?.includes('wallet') || error.message?.includes('Wallet')) {
      throw new Error('Wallet connection issue. Please reconnect your wallet.');
    } else {
      throw new Error('Failed to send beacon. Please try again.');
    }
  }
};
