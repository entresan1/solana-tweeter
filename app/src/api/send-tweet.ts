import { TweetModel } from '@src/models/tweet.model';
import { useWorkspace } from '@src/hooks';
import { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { beaconService } from '@src/lib/supabase';

// Treasury address for beacon payments
const TREASURY_ADDRESS = 'hQGYkc3kq3z6kJY2coFAoBaFhCgtSTa4UyEgVrCqFL6';

export const sendTweet = async (topic: string, content: string) => {
  const { wallet, connection } = useWorkspace();

  try {
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Create treasury public key
    let treasuryPubkey;
    try {
      treasuryPubkey = new PublicKey(TREASURY_ADDRESS);
    } catch (error) {
      console.error('Invalid treasury address:', TREASURY_ADDRESS);
      throw new Error('Invalid treasury address');
    }
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    
    // Create transfer instruction (0.001 SOL to treasury)
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: wallet.value.publicKey,
      toPubkey: treasuryPubkey,
      lamports: 0.001 * LAMPORTS_PER_SOL, // 0.001 SOL
    });

    // Create transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.value.publicKey,
    });

    transaction.add(transferInstruction);

    // Sign transaction
    const signedTransaction = await wallet.value.signTransaction(transaction);

    // Send transaction
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      }
    );

    // Confirm transaction
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    );

    // Store beacon data in Supabase database
    const beaconData = {
      topic,
      content,
      author: wallet.value.publicKey.toString(),
      author_display: wallet.value.publicKey.toString().slice(0, 8) + '...',
      timestamp: Date.now(),
      treasury_transaction: signature,
    };

    // Save to Supabase database
    try {
      await beaconService.createBeacon(beaconData);
      console.log('Beacon saved to Supabase database');
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      console.log('Saving to localStorage as backup...');
      
      // Fallback to localStorage if database fails
      const existingBeacons = JSON.parse(localStorage.getItem('beacons') || '[]');
      existingBeacons.push(beaconData);
      localStorage.setItem('beacons', JSON.stringify(existingBeacons));
    }

    // Create a mock PublicKey for compatibility (not from signature)
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
      treasuryTransaction: signature,
      author_display: wallet.value.publicKey.toBase58().slice(0, 8) + '...'
    });
    
    console.log('✅ Created TweetModel for new beacon:', tweetModel);
    return tweetModel;
  } catch (error: any) {
    console.error('Send beacon error:', error);
    
    // Handle specific error cases
    if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
      throw new Error('Transaction was cancelled by user');
    } else if (error.message?.includes('Invalid public key') || error.message?.includes('Invalid treasury address')) {
      throw new Error('Invalid treasury address configuration');
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
