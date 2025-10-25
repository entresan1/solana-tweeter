import { TweetModel } from '@src/models/tweet.model';
import { web3 } from '@project-serum/anchor';
import { useWorkspace } from '@src/hooks';

export const sendTweet = async (topic: string, content: string) => {
  const { wallet, program } = useWorkspace();
  const tweet = web3.Keypair.generate();

  try {
    await program.value.methods
      .sendTweet(topic, content)
      .accounts({
        tweet: tweet.publicKey,
        author: wallet.value?.publicKey,
        systemProgram: web3.SystemProgram.programId,
      })
      .signers([tweet])
      .rpc({
        skipPreflight: false,
        preflightCommitment: 'finalized',
        commitment: 'finalized',
      });

    const tweetAccount = await program.value.account.tweet.fetch(tweet.publicKey);
    return new TweetModel(tweet.publicKey, tweetAccount);
  } catch (error) {
    console.error('Send tweet error:', error);
    throw error;
  }
};
