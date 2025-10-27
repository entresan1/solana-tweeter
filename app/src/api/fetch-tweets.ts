import { TweetModel } from '@src/models/tweet.model';
import { PublicKey } from '@solana/web3.js';
import { getBeacons, on, off } from '@src/lib/sse-service';

export const fetchTweets = async (filters: any[] = []) => {
  console.log('📡 fetchTweets called with filters:', filters);
  
  try {
    // Get beacons from SSE service instead of direct database call
    const beacons = getBeacons();
    console.log('📡 Fetched beacons from SSE service:', beacons);
    console.log('📡 Number of beacons:', beacons.length);
    
    // Convert to TweetModel format for compatibility
    const tweetModels = beacons.map((beacon: any, index: number) => {
      console.log(`📡 Processing beacon ${index + 1}:`, beacon);
      console.log(`📡 Beacon ID: ${beacon.id}`);
      console.log(`📡 Beacon content: ${beacon.content}`);
      console.log(`📡 Beacon topic: ${beacon.topic}`);
      
      // Create a deterministic mock PublicKey for each beacon
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1; // Unique identifier
      mockKeyBytes[31] = 0x42; // Mark as beacon
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(beacon.author),
        timestamp: { toNumber: () => beacon.timestamp / 1000 },
        topic: beacon.topic,
        content: beacon.content,
        id: beacon.id, // Pass ID in accountData
        treasuryTransaction: beacon.treasury_transaction || beacon.id,
        author_display: beacon.author_display || beacon.author?.toString()?.slice(0, 8) + '...' || 'Unknown User'
      });
      
      console.log(`📡 Created TweetModel with ID: ${tweetModel.id}`);
      return tweetModel;
    });
    
    console.log('📡 Returning tweet models:', tweetModels);
    return tweetModels;
  } catch (error) {
    console.error('❌ Error fetching beacons from SSE service:', error);
    return [];
  }
};

export const authorFilter = async (authorBase58PublicKey: string) => {
  try {
    console.log('👤 authorFilter called with author:', authorBase58PublicKey);
    // Fetch beacons by author from Supabase
    const beacons = await beaconService.fetchBeaconsByAuthor(authorBase58PublicKey);
    console.log('👤 Found beacons for author:', beacons.length);
    
    // Convert to TweetModel format for compatibility
    return beacons.map((beacon: any, index: number) => {
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1;
      mockKeyBytes[31] = 0x42;
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(beacon.author),
        timestamp: { toNumber: () => beacon.timestamp / 1000 },
        topic: beacon.topic,
        content: beacon.content,
      });
      
      // Add additional properties
      tweetModel.id = beacon.id;
      tweetModel.treasuryTransaction = beacon.treasury_transaction || beacon.id;
      tweetModel.authorDisplay = beacon.author_display || beacon.author?.toString()?.slice(0, 8) + '...' || 'Unknown User';
      
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
    // Fetch beacons by topic from Supabase
    const beacons = await beaconService.fetchBeaconsByTopic(topic);
    console.log('🔍 Found beacons for topic:', beacons.length);
    
    // Convert to TweetModel format for compatibility
    return beacons.map((beacon: any, index: number) => {
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1;
      mockKeyBytes[31] = 0x42;
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(beacon.author),
        timestamp: { toNumber: () => beacon.timestamp / 1000 },
        topic: beacon.topic,
        content: beacon.content,
      });
      
      // Add additional properties
      tweetModel.id = beacon.id;
      tweetModel.treasuryTransaction = beacon.treasury_transaction || beacon.id;
      tweetModel.authorDisplay = beacon.author_display || beacon.author?.toString()?.slice(0, 8) + '...' || 'Unknown User';
      
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
    
    // Fetch all beacons and filter by content
    const allBeacons = await beaconService.fetchBeacons();
    console.log('🔍 Total beacons fetched:', allBeacons.length);
    
    // Filter beacons that contain the search term in content or topic
    const filteredBeacons = allBeacons.filter((beacon: any) => 
      beacon.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      beacon.topic.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('🔍 Filtered beacons:', filteredBeacons.length);
    
    // Convert to TweetModel format for compatibility
    return filteredBeacons.map((beacon: any, index: number) => {
      const mockKeyBytes = new Uint8Array(32);
      mockKeyBytes.fill(0);
      mockKeyBytes[0] = index + 1;
      mockKeyBytes[31] = 0x42;
      
      // Create TweetModel instance
      const tweetModel = new TweetModel(new PublicKey(mockKeyBytes), {
        author: new PublicKey(beacon.author),
        timestamp: { toNumber: () => beacon.timestamp / 1000 },
        topic: beacon.topic,
        content: beacon.content,
      });
      
      // Add additional properties
      tweetModel.id = beacon.id;
      tweetModel.treasuryTransaction = beacon.treasury_transaction || beacon.id;
      tweetModel.authorDisplay = beacon.author_display || beacon.author?.toString()?.slice(0, 8) + '...' || 'Unknown User';
      
      return tweetModel;
    });
  } catch (error) {
    console.error('Error searching beacons:', error);
    return [];
  }
};
