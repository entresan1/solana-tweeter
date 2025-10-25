import { TweetModel } from '@src/models/tweet.model';
import { web3 } from '@project-serum/anchor';
import { useWorkspace } from '@src/hooks';
import { Connection, Transaction, SystemProgram, PublicKey } from '@solana/web3.js';

export const sendTweet = async (topic: string, content: string) => {
  const { wallet, program, connection } = useWorkspace();
  const tweet = web3.Keypair.generate();

  try {
    if (!wallet.value?.publicKey) {
      throw new Error('Wallet not connected');
    }

    // Get the latest blockhash using the modern method
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    
    // Create the instruction using Anchor's method but get the instruction
    const instruction = await program.value.methods
      .sendTweet(topic, content)
      .accounts({
        tweet: tweet.publicKey,
        author: wallet.value.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    // Create transaction manually
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: wallet.value.publicKey,
    });

    transaction.add(instruction);
    
    // Sign with the tweet keypair first
    transaction.sign(tweet);
    
    // Sign with the wallet
    const signedTransaction = await wallet.value.signTransaction(transaction);
    
    // Send the transaction using sendRawTransaction
    const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    // Fetch the tweet account
    const tweetAccount = await program.value.account.tweet.fetch(tweet.publicKey);
    return new TweetModel(tweet.publicKey, tweetAccount);
  } catch (error) {
    console.error('Send tweet error:', error);
    throw error;
  }
};
