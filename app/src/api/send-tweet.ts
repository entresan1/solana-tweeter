import { TweetModel } from '@src/models/tweet.model';
import { useWorkspace } from '@src/hooks';
import { PublicKey } from '@solana/web3.js';
import { sendBeaconWithPayment } from '@src/lib/x402-client';
import { platformWalletService } from '@src/lib/platform-wallet';

export const sendTweet = async (topic: string, content: string, usePlatformWallet: boolean = false) => {
  const { wallet } = useWorkspace();

  try {
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('🚀 Sending beacon with x402 payment...', { usePlatformWallet });
    
    // Always try platform wallet first if user has one, regardless of preference
    const userAddress = wallet.value.publicKey.toBase58();
    const platformBalance = await platformWalletService.getBalance(userAddress);
    const hasPlatformWallet = platformBalance > 0.001; // Check if has enough for beacon (0.001 SOL)
    
    if (hasPlatformWallet) {
      console.log('💰 Using platform wallet (sufficient balance):', platformBalance.toFixed(6), 'SOL');
      // Use platform wallet for beacon creation
      const { sendBeaconWithPlatformWallet } = await import('@src/lib/x402-platform-client');
      const response = await sendBeaconWithPlatformWallet(topic, content, wallet.value.publicKey.toBase58());
      
      if (!response.success) {
        // If platform wallet fails, fall back to Phantom wallet
        console.log('⚠️ Platform wallet failed, falling back to Phantom wallet:', response.message);
        throw new Error(`Platform wallet failed: ${response.message}. Falling back to Phantom wallet.`);
      }
      
      console.log('✅ Beacon sent successfully with platform wallet:', response);
      
      // Create a mock PublicKey for compatibility
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = 1; // Mark as beacon
      mockKeyBytes[31] = 0x42; // Mark as beacon
      
      // Create a proper TweetModel instance
      const mockKey = new PublicKey(mockKeyBytes);
      const tweetModel = new TweetModel(mockKey, {
        author: wallet.value.publicKey,
        timestamp: { toNumber: () => Date.now() / 1000 },
        topic: topic,
        content: content,
        id: response.beacon?.id || Date.now(),
        treasuryTransaction: response.payment?.transaction || 'platform-wallet-tx',
        author_display: wallet.value.publicKey.toBase58().slice(0, 8) + '...'
      });
      
      return tweetModel;
    } else {
      // Platform wallet has insufficient funds, use Phantom wallet
      console.log('💳 Platform wallet insufficient funds, using Phantom wallet');
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
    }
  } catch (error: any) {
    console.error('Send beacon error:', error);
    
    // Check if this is a platform wallet fallback error
    if (error.message?.includes('Platform wallet failed') && error.message?.includes('Falling back to Phantom wallet')) {
      console.log('🔄 Retrying with Phantom wallet after platform wallet failure');
      try {
        // Retry with Phantom wallet
        const response = await sendBeaconWithPayment(topic, content, wallet.value);
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to send beacon with Phantom wallet');
        }

        console.log('✅ Beacon sent successfully with Phantom wallet (fallback):', response);

        // Create a mock PublicKey for compatibility
        const mockKeyBytes = new Uint8Array(32);
        mockKeyBytes.fill(0);
        mockKeyBytes[0] = 1; // Mark as beacon
        mockKeyBytes[31] = 0x42; // Mark as beacon
        
        // Return a proper TweetModel instance
        const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
          author: wallet.value.publicKey!,
          timestamp: { toNumber: () => Date.now() / 1000 },
          topic,
          content,
          treasuryTransaction: response.payment?.transaction || 'unknown',
          author_display: wallet.value.publicKey!.toBase58().slice(0, 8) + '...'
        });
        
        console.log('✅ Created TweetModel for new beacon (Phantom fallback):', tweetModel);
        return tweetModel;
      } catch (fallbackError: any) {
        console.error('❌ Phantom wallet fallback also failed:', fallbackError);
        // Continue to regular error handling below
        throw fallbackError;
      }
    }
    
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
