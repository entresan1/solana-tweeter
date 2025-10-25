import { TweetModel } from '@src/models/tweet.model';
import { PublicKey } from '@solana/web3.js';
import { beaconService } from '@src/lib/supabase';

export const fetchTweets = async (filters: any[] = []) => {
  console.log('📡 fetchTweets called with filters:', filters);
  console.log('📡 Environment:', process.env.NODE_ENV);
  console.log('📡 User agent:', navigator.userAgent);
  console.log('📡 Location:', window.location.href);
  
  try {
    console.log('📡 Fetching beacons from Supabase...');
    // Fetch beacons from Supabase database
    const beacons = await beaconService.fetchBeacons(filters);
    console.log('📡 Fetched beacons from Supabase:', beacons);
    console.log('📡 Number of beacons:', beacons.length);
    
    if (beacons.length === 0) {
      console.log('⚠️ No beacons found in database - this might be the issue!');
      console.log('⚠️ Check if database tables exist and have data');
    }
    
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
    console.error('❌ Error fetching beacons from Supabase:', error);
    console.log('📡 Falling back to localStorage...');
    
    // Fallback to localStorage if database fails
    try {
      const beacons = JSON.parse(localStorage.getItem('beacons') || '[]');
      console.log('📡 Fetched beacons from localStorage:', beacons);
      console.log('📡 Number of beacons found:', beacons.length);
      
      if (beacons.length === 0) {
        console.log('📡 No beacons found in localStorage');
        return [];
      }
      
      return beacons.map((beacon: any, index: number) => {
        console.log('📡 Processing localStorage beacon:', beacon);
        console.log('📡 Beacon content:', beacon.content);
        console.log('📡 Beacon topic:', beacon.topic);
        
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
          id: beacon.id, // Pass ID in accountData
          treasuryTransaction: beacon.treasury_transaction || beacon.id,
          author_display: beacon.author_display || beacon.author?.toString()?.slice(0, 8) + '...' || 'Unknown User'
        });
        
        return tweetModel;
      });
    } catch (localError) {
      console.error('❌ Error fetching from localStorage:', localError);
      return [];
    }
  }
};

export const authorFilter = async (authorBase58PublicKey: string) => {
  try {
    // Fetch beacons by author from Supabase
    const beacons = await beaconService.fetchBeaconsByAuthor(authorBase58PublicKey);
    
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
    // Fetch beacons by topic from Supabase
    const beacons = await beaconService.fetchBeaconsByTopic(topic);
    
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
    // Fetch all beacons and filter by content
    const allBeacons = await beaconService.fetchBeacons();
    
    // Filter beacons that contain the search term in content or topic
    const filteredBeacons = allBeacons.filter((beacon: any) => 
      beacon.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      beacon.topic.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
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
