// SECURITY: All database operations now go through server-side APIs
// No direct client-side Supabase access to prevent security vulnerabilities

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

// Database operations - now using server-side APIs for security
export const beaconService = {
  // Create a new beacon
  async createBeacon(beacon: Omit<Beacon, 'id' | 'created_at'>) {
    const response = await fetch('/api/save-beacon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(beacon)
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create beacon');
    }
    
    return data.beacon;
  },

  // Fetch all beacons
  async fetchBeacons(filters: any[] = []) {
    console.log('🗄️ fetchBeacons called with filters:', filters);
    
    try {
      const response = await fetch('/api/beacons');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch beacons');
      }
      
      console.log('🗄️ Returning beacons:', data.beacons || []);
      return data.beacons || [];
    } catch (error) {
      console.error('❌ Server-side beacons fetch error:', error);
      throw error;
    }
  },

  // Fetch beacons by author
  async fetchBeaconsByAuthor(author: string) {
    try {
      const response = await fetch(`/api/beacons?author=${encodeURIComponent(author)}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch beacons by author');
      }
      
      return data.beacons || [];
    } catch (error) {
      console.error('❌ Server-side beacons by author fetch error:', error);
      throw error;
    }
  },

  // Fetch beacons by topic
  async fetchBeaconsByTopic(topic: string) {
    try {
      const response = await fetch(`/api/beacons?topic=${encodeURIComponent(topic)}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch beacons by topic');
      }
      
      return data.beacons || [];
    } catch (error) {
      console.error('❌ Server-side beacons by topic fetch error:', error);
      throw error;
    }
  }
}

// Enhanced cache to avoid repeated queries for non-existent profiles
const profileCache = new Map<string, { profile: any | null; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (increased from 5)

// Track ongoing requests to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>();
const requestQueue = new Map<string, number>(); // Track request timestamps
const MIN_REQUEST_INTERVAL = 200; // Minimum 200ms between requests for same wallet

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
  // Get user profile by wallet address with enhanced rate limiting
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
    
    // Rate limiting: check if we've made a request too recently
    const lastRequest = requestQueue.get(walletAddress);
    const now = Date.now();
    if (lastRequest && (now - lastRequest) < MIN_REQUEST_INTERVAL) {
      console.log('🎯 Rate limiting: waiting for wallet:', walletAddress.slice(0, 8) + '...');
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - (now - lastRequest)));
    }
    
    console.log('🎯 Cache miss for wallet:', walletAddress.slice(0, 8) + '...');
    
    // Update request timestamp
    requestQueue.set(walletAddress, now);
    
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
      const response = await fetch(`/api/user-profiles?walletAddress=${encodeURIComponent(walletAddress)}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Profile doesn't exist, cache null result
          profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
          return null;
        }
        if (response.status === 429) {
          // Rate limited, wait a bit and throw error to retry later
          console.warn('Rate limited, will retry later');
          throw new Error('Rate limited');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Cache successful result
        profileCache.set(walletAddress, { profile: data.profile, timestamp: Date.now() });
        return data.profile;
      } else {
        // Profile doesn't exist, cache null result
        profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Profile fetch failed:', error);
      // Don't cache errors, let them retry
      throw error;
    }
  },

  // Create or update user profile
  async upsertProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
    try {
      // Import CSRF service dynamically to avoid circular imports
      const { csrfService } = await import('./csrf-service');
      
      const response = await csrfService.makeAuthenticatedRequest('/api/user-profiles', {
        method: 'POST',
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
    requestQueue.clear();
  },

  // Update profile picture
  async updateProfilePicture(walletAddress: string, imageUrl: string) {
    const { csrfService } = await import('./csrf-service');
    
    const response = await csrfService.makeAuthenticatedRequest('/api/user-profiles', {
      method: 'PUT',
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
    const { csrfService } = await import('./csrf-service');
    
    const response = await csrfService.makeAuthenticatedRequest('/api/user-profiles', {
      method: 'PUT',
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
    console.debug('[beacon] Origin:', location.origin);
    console.debug('[beacon] Has cookies:', document.cookie.length > 0);

    try {
      const { makeAuthenticatedRequest } = await import('./csrf-service');
      
      const data = await makeAuthenticatedRequest('/api/beacon-interactions', {
        method: 'POST',
        body: JSON.stringify({ beaconId, userWallet, action: 'like' }),
        auth: { walletAddress: userWallet }
      });
      
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
      const { makeAuthenticatedRequest } = await import('./csrf-service');
      
      const data = await makeAuthenticatedRequest('/api/beacon-interactions', {
        method: 'DELETE',
        body: JSON.stringify({ beaconId, userWallet, action: 'like' }),
        auth: { walletAddress: userWallet }
      });
      
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
    console.debug('[beacon] Origin:', location.origin);
    console.debug('[beacon] Has cookies:', document.cookie.length > 0);

    try {
      const { makeAuthenticatedRequest } = await import('./csrf-service');
      
      const data = await makeAuthenticatedRequest('/api/beacon-replies', {
        method: 'POST',
        body: JSON.stringify({ beaconId, userWallet, content }),
        auth: { walletAddress: userWallet }
      });
      
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
