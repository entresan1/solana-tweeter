import { TweetModel } from '@src/models/tweet.model';
import { PublicKey } from '@solana/web3.js';
import { getTweets, isServiceInitialized } from '@src/lib/http-tweets-service';

export const fetchTweets = async (filters: any[] = []) => {
  console.log('📡 fetchTweets called with filters:', filters);
  
  try {
    // Check if HTTP service is initialized
    if (!isServiceInitialized()) {
      console.log('📡 HTTP service not initialized yet, returning empty array');
      return [];
    }
    
    // Get tweets from WebSocket service instead of direct database call
    const tweets = getTweets();
    console.log('📡 Fetched tweets from WebSocket service:', tweets);
    console.log('📡 Number of tweets:', tweets.length);
    
    // Convert to TweetModel format for compatibility
    const tweetModels = tweets.map((tweet: any, index: number) => {
      console.log(`📡 Processing tweet ${index + 1}:`, tweet);
      console.log(`📡 Tweet ID: ${tweet.id}`);
      console.log(`📡 Tweet content: ${tweet.content}`);
      console.log(`📡 Tweet topic: ${tweet.topic}`);
      
      // Create a deterministic mock PublicKey for each tweet
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1; // Unique identifier
      mockKeyBytes[31] = 0x42; // Mark as tweet
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(tweet.author),
        timestamp: { toNumber: () => tweet.timestamp / 1000 },
        topic: tweet.topic,
        content: tweet.content,
        id: tweet.id, // Pass ID in accountData
        treasuryTransaction: tweet.treasuryTransaction || tweet.id,
        author_display: tweet.authorDisplay || tweet.author?.toString()?.slice(0, 8) + '...' || 'Unknown User'
      });
      
      console.log(`📡 Created TweetModel with ID: ${tweetModel.id}`);
      return tweetModel;
    });
    
    console.log('📡 Returning tweet models:', tweetModels);
    return tweetModels;
  } catch (error) {
    console.error('❌ Error fetching beacons from WebSocket service:', error);
    return [];
  }
};

export const authorFilter = async (authorBase58PublicKey: string) => {
  try {
    console.log('👤 authorFilter called with author:', authorBase58PublicKey);
    
    // Check if WebSocket is initialized
    if (!isWSInitialized()) {
      console.log('👤 WebSocket not initialized yet, returning empty array');
      return [];
    }
    
    // Get tweets from WebSocket service and filter by author
    const allTweets = getTweets();
    const tweets = allTweets.filter(tweet => tweet.author === authorBase58PublicKey);
    console.log('👤 Found tweets for author:', tweets.length);
    
    // Convert to TweetModel format for compatibility
    return tweets.map((tweet: any, index: number) => {
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1;
      mockKeyBytes[31] = 0x42;
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(tweet.author),
        timestamp: { toNumber: () => tweet.timestamp / 1000 },
        topic: tweet.topic,
        content: tweet.content,
      });
      
      // Add additional properties
      tweetModel.id = tweet.id;
      tweetModel.treasuryTransaction = tweet.treasuryTransaction || tweet.id;
      tweetModel.authorDisplay = tweet.authorDisplay || tweet.author?.toString()?.slice(0, 8) + '...' || 'Unknown User';
      
      return tweetModel;
    });
  } catch (error) {
    console.error('Error fetching beacons by author:', error);
    return [];
  }
};

export const topicFilter = async (topic: string) => {
  try {
    console.log('🔍 topicFilter called with topic:', topic);
    
    // Check if WebSocket is initialized
    if (!isWSInitialized()) {
      console.log('🔍 WebSocket not initialized yet, returning empty array');
      return [];
    }
    
    // Get tweets from WebSocket service and filter by topic
    const allTweets = getTweets();
    const tweets = allTweets.filter(tweet => tweet.topic === topic);
    console.log('🔍 Found tweets for topic:', tweets.length);
    
    // Convert to TweetModel format for compatibility
    return tweets.map((tweet: any, index: number) => {
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1;
      mockKeyBytes[31] = 0x42;
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(tweet.author),
        timestamp: { toNumber: () => tweet.timestamp / 1000 },
        topic: tweet.topic,
        content: tweet.content,
      });
      
      // Add additional properties
      tweetModel.id = tweet.id;
      tweetModel.treasuryTransaction = tweet.treasuryTransaction || tweet.id;
      tweetModel.authorDisplay = tweet.authorDisplay || tweet.author?.toString()?.slice(0, 8) + '...' || 'Unknown User';
      
      return tweetModel;
    });
  } catch (error) {
    console.error('Error fetching beacons by topic:', error);
    return [];
  }
};

// Search beacons by content (not just topic)
export const searchBeacons = async (searchTerm: string) => {
  try {
    console.log('🔍 searchBeacons called with searchTerm:', searchTerm);
    // Return empty array if search term is empty
    if (!searchTerm || searchTerm.trim() === '') {
      console.log('🔍 Empty search term, returning empty array');
      return [];
    }
    
    // Check if WebSocket is initialized
    if (!isWSInitialized()) {
      console.log('🔍 WebSocket not initialized yet, returning empty array');
      return [];
    }
    
    // Get all tweets from WebSocket service and filter by content
    const allTweets = getTweets();
    console.log('🔍 Total tweets fetched:', allTweets.length);
    
    // Filter tweets that contain the search term in content or topic
    const filteredTweets = allTweets.filter((tweet: any) => 
      (tweet.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tweet.topic || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('🔍 Filtered tweets:', filteredTweets.length);
    
    // Convert to TweetModel format for compatibility
    return filteredTweets.map((tweet: any, index: number) => {
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1;
      mockKeyBytes[31] = 0x42;
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(tweet.author),
        timestamp: { toNumber: () => tweet.timestamp / 1000 },
        topic: tweet.topic,
        content: tweet.content,
      });
      
      // Add additional properties
      tweetModel.id = tweet.id;
      tweetModel.treasuryTransaction = tweet.treasuryTransaction || tweet.id;
      tweetModel.authorDisplay = tweet.authorDisplay || tweet.author?.toString()?.slice(0, 8) + '...' || 'Unknown User';
      
      return tweetModel;
    });
  } catch (error) {
    console.error('Error searching beacons:', error);
    return [];
  }
};
