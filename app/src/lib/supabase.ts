import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://voskmcxmtvophehityoa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ'

console.log('🔧 Initializing Supabase client...');
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🔧 SUPABASE_URL:', supabaseUrl);
console.log('🔧 SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
console.log('🔧 Full URL:', supabaseUrl);
console.log('🔧 Key length:', supabaseAnonKey?.length);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client initialized');

// Test the connection
(async () => {
  try {
    const { data, error } = await supabase.from('beacons').select('count');
    console.log('🔧 Supabase connection test:', { data, error });
    if (error) {
      console.error('❌ Supabase connection failed:', error);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (err: any) {
    console.error('❌ Supabase connection error:', err);
  }
})();

// Database schema for beacons
export interface Beacon {
  id: string
  topic: string
  content: string
  author: string
  author_display: string
  timestamp: number
  treasury_transaction: string
  created_at?: string
}

// User profile interface
export interface UserProfile {
  id?: number
  wallet_address: string
  nickname?: string
  profile_picture_url?: string
  bio?: string
  created_at?: string
  updated_at?: string
}

// Database operations
export const beaconService = {
  // Create a new beacon
  async createBeacon(beacon: Omit<Beacon, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('beacons')
      .insert([beacon])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Fetch all beacons
  async fetchBeacons(filters: any[] = []) {
    console.log('🗄️ fetchBeacons called with filters:', filters);
    
    let query = supabase
      .from('beacons')
      .select('*')
      .order('timestamp', { ascending: false })

    // Apply filters if any
    for (const filter of filters) {
      if (filter.memcmp) {
        if (filter.memcmp.bytes === 'author') {
          query = query.eq('author', filter.memcmp.bytes)
        }
      }
    }

    console.log('🗄️ Executing Supabase query...');
    const { data, error } = await query;
    console.log('🗄️ Supabase query result:', { data, error });

    if (error) {
      console.error('❌ Supabase query error:', error);
      throw error;
    }
    
    console.log('🗄️ Returning beacons:', data || []);
    return data || [];
  },

  // Fetch beacons by author
  async fetchBeaconsByAuthor(author: string) {
    const { data, error } = await supabase
      .from('beacons')
      .select('*')
      .eq('author', author)
      .order('timestamp', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Fetch beacons by topic
  async fetchBeaconsByTopic(topic: string) {
    const { data, error } = await supabase
      .from('beacons')
      .select('*')
      .eq('topic', topic)
      .order('timestamp', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

// Simple cache to avoid repeated queries for non-existent profiles
const profileCache = new Map<string, { profile: any | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Track ongoing requests to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>();

// Tip service
export const tipService = {
  // Get tip totals for a beacon
  async getBeaconTips(beaconId: number) {
    try {
      const response = await fetch(`/api/beacon-tips?beaconId=${beaconId}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          totalTips: parseFloat(data.totalTips),
          tipCount: data.tipCount
        };
      } else {
        console.warn('⚠️ Failed to fetch beacon tips:', data.message);
        return { totalTips: 0, tipCount: 0 };
      }
    } catch (error) {
      console.warn('⚠️ Error fetching beacon tips:', error);
      return { totalTips: 0, tipCount: 0 };
    }
  }
};

// User profile service - now uses server-side API
export const profileService = {
  // Get user profile by wallet address
  async getProfile(walletAddress: string) {
    // Check cache first
    const cached = profileCache.get(walletAddress);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('🎯 Cache hit for wallet:', walletAddress.slice(0, 8) + '...');
      return cached.profile;
    }
    
    // Check if there's already a pending request for this wallet
    if (pendingRequests.has(walletAddress)) {
      console.log('🎯 Waiting for pending request for wallet:', walletAddress.slice(0, 8) + '...');
      return await pendingRequests.get(walletAddress);
    }
    
    console.log('🎯 Cache miss for wallet:', walletAddress.slice(0, 8) + '...');
    
    // Create a new request and store it
    const requestPromise = this._fetchProfile(walletAddress);
    pendingRequests.set(walletAddress, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the pending request
      pendingRequests.delete(walletAddress);
    }
  },

  // Internal method to actually fetch the profile
  async _fetchProfile(walletAddress: string) {
    try {
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(`/api/user-profiles?walletAddress=${encodeURIComponent(walletAddress)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Cache successful result
        profileCache.set(walletAddress, { profile: data.profile, timestamp: Date.now() });
        return data.profile;
      } else {
        throw new Error(data.error || 'Failed to fetch profile');
      }
    } catch (error) {
      console.warn('⚠️ Profile fetch failed:', error);
      profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
      return null;
    }
  },

  // Create or update user profile
  async upsertProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const response = await fetch('/api/user-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Profile upserted successfully:', data.profile);
        
        // Clear cache for this wallet address
        profileCache.delete(profile.wallet_address);
        
        return data.profile;
      } else {
        throw new Error(data.error || 'Failed to upsert profile');
      }
    } catch (error) {
      console.error('❌ Profile upsert failed:', error);
      throw error;
    }
  },

  // Clear profile cache (useful for testing or manual cache invalidation)
  clearCache() {
    profileCache.clear();
    pendingRequests.clear();
  },

  // Update profile picture
  async updateProfilePicture(walletAddress: string, imageUrl: string) {
    const response = await fetch('/api/user-profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        walletAddress,
        profile: { profile_picture_url: imageUrl }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      // Clear cache for this wallet address
      profileCache.delete(walletAddress);
      return data.profile;
    } else {
      throw new Error(data.error || 'Failed to update profile picture');
    }
  },

  // Update nickname
  async updateNickname(walletAddress: string, nickname: string) {
    const response = await fetch('/api/user-profiles', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        walletAddress,
        profile: { nickname }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      // Clear cache for this wallet address
      profileCache.delete(walletAddress);
      return data.profile;
    } else {
      throw new Error(data.error || 'Failed to update nickname');
    }
  }
}

// Like and reply service - now uses server-side API
export const interactionService = {
  // Like a beacon
  async likeBeacon(beaconId: number, userWallet: string) {
    console.log('🔥 likeBeacon called with:', { beaconId, userWallet });
    
    try {
      const response = await fetch('/api/beacon-interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ beaconId, userWallet, action: 'like' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ likeBeacon success:', data.like);
        return data.like;
      } else {
        throw new Error(data.error || 'Failed to like beacon');
      }
    } catch (error) {
      console.error('❌ likeBeacon exception:', error);
      throw error;
    }
  },

  // Unlike a beacon
  async unlikeBeacon(beaconId: number, userWallet: string) {
    console.log('💔 unlikeBeacon called with:', { beaconId, userWallet });
    
    try {
      const response = await fetch('/api/beacon-interactions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ beaconId, userWallet, action: 'like' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ unlikeBeacon success');
      } else {
        throw new Error(data.error || 'Failed to unlike beacon');
      }
    } catch (error) {
      console.error('❌ unlikeBeacon exception:', error);
      throw error;
    }
  },

  // Check if user liked a beacon
  async hasUserLiked(beaconId: number, userWallet: string) {
    console.log('🔍 hasUserLiked called with:', { beaconId, userWallet });
    
    try {
      const response = await fetch(`/api/beacon-interactions?beaconId=${beaconId}&userWallet=${userWallet}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ hasUserLiked success:', data.hasUserLiked);
        return data.hasUserLiked;
      } else {
        throw new Error(data.error || 'Failed to check like status');
      }
    } catch (error) {
      console.error('❌ hasUserLiked exception:', error);
      throw error;
    }
  },

  // Get like count for a beacon
  async getLikeCount(beaconId: number) {
    console.log('📊 getLikeCount called with:', { beaconId });
    
    try {
      const response = await fetch(`/api/beacon-interactions?beaconId=${beaconId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ getLikeCount success:', data.likeCount);
        return data.likeCount;
      } else {
        throw new Error(data.error || 'Failed to get like count');
      }
    } catch (error) {
      console.error('❌ getLikeCount exception:', error);
      throw error;
    }
  },

  // Reply to a beacon
  async replyToBeacon(beaconId: number, userWallet: string, content: string) {
    console.log('💬 replyToBeacon called with:', { beaconId, userWallet, content });
    
    try {
      const response = await fetch('/api/beacon-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ beaconId, userWallet, content })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ replyToBeacon success:', data.reply);
        return data.reply;
      } else {
        throw new Error(data.error || 'Failed to reply to beacon');
      }
    } catch (error) {
      console.error('❌ replyToBeacon exception:', error);
      throw error;
    }
  },

  // Get replies for a beacon
  async getBeaconReplies(beaconId: number) {
    try {
      const response = await fetch(`/api/beacon-replies?beaconId=${beaconId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return data.replies || [];
      } else {
        throw new Error(data.error || 'Failed to get beacon replies');
      }
    } catch (error) {
      console.error('❌ getBeaconReplies exception:', error);
      throw error;
    }
  }
}
