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

// User profile service
export const profileService = {
  // Get user profile by wallet address
  async getProfile(walletAddress: string) {
    // Check cache first
    const cached = profileCache.get(walletAddress);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('🎯 Cache hit for wallet:', walletAddress.slice(0, 8) + '...');
      return cached.profile;
    }
    
    console.log('🎯 Cache miss for wallet:', walletAddress.slice(0, 8) + '...');
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is normal
          profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
          return null;
        } else if (error.code === 'PGRST301' || error.message?.includes('406')) {
          // 406 Not Acceptable - likely RLS issue, treat as no profile found
          console.warn('⚠️ Profile fetch blocked by RLS (406) - treating as no profile found');
          profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
          return null;
        } else {
          console.warn('⚠️ Profile fetch failed:', error.message);
          profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
          return null;
        }
      }
      
      // Cache successful result
      profileCache.set(walletAddress, { profile: data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.warn('⚠️ Profile fetch failed:', error);
      profileCache.set(walletAddress, { profile: null, timestamp: Date.now() });
      return null;
    }
  },

  // Create or update user profile
  async upsertProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert([{
          ...profile,
          updated_at: new Date().toISOString()
        }], {
          onConflict: 'wallet_address'
        })
        .select()
        .single()
      
      if (error) {
        console.error('❌ Profile upsert error:', error);
        throw error;
      }
      
      console.log('✅ Profile upserted successfully:', data);
      
      // Clear cache for this wallet address
      profileCache.delete(profile.wallet_address);
      
      return data;
    } catch (error) {
      console.error('❌ Profile upsert failed:', error);
      throw error;
    }
  },

  // Clear profile cache (useful for testing or manual cache invalidation)
  clearCache() {
    profileCache.clear();
  },

  // Update profile picture
  async updateProfilePicture(walletAddress: string, imageUrl: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        profile_picture_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update nickname
  async updateNickname(walletAddress: string, nickname: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        nickname: nickname,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Like and reply service
export const interactionService = {
  // Like a beacon
  async likeBeacon(beaconId: number, userWallet: string) {
    console.log('🔥 likeBeacon called with:', { beaconId, userWallet });
    
    try {
      const { data, error } = await supabase
        .from('beacon_likes')
        .insert([{
          beacon_id: beaconId,
          user_wallet: userWallet
        }])
        .select()
        .single()
      
      console.log('🔥 likeBeacon result:', { data, error });
      
      if (error) {
        console.error('❌ likeBeacon error:', error);
        throw error;
      }
      
      console.log('✅ likeBeacon success:', data);
      return data;
    } catch (error) {
      console.error('❌ likeBeacon exception:', error);
      throw error;
    }
  },

  // Unlike a beacon
  async unlikeBeacon(beaconId: number, userWallet: string) {
    console.log('💔 unlikeBeacon called with:', { beaconId, userWallet });
    
    try {
      const { error } = await supabase
        .from('beacon_likes')
        .delete()
        .eq('beacon_id', beaconId)
        .eq('user_wallet', userWallet)
      
      console.log('💔 unlikeBeacon result:', { error });
      
      if (error) {
        console.error('❌ unlikeBeacon error:', error);
        throw error;
      }
      
      console.log('✅ unlikeBeacon success');
    } catch (error) {
      console.error('❌ unlikeBeacon exception:', error);
      throw error;
    }
  },

  // Check if user liked a beacon
  async hasUserLiked(beaconId: number, userWallet: string) {
    console.log('🔍 hasUserLiked called with:', { beaconId, userWallet });
    
    try {
      const { data, error } = await supabase
        .from('beacon_likes')
        .select('id')
        .eq('beacon_id', beaconId)
        .eq('user_wallet', userWallet)
        .single()
      
      console.log('🔍 hasUserLiked result:', { data, error });
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ hasUserLiked error:', error);
        throw error;
      }
      
      const result = !!data;
      console.log('✅ hasUserLiked success:', result);
      return result;
    } catch (error) {
      console.error('❌ hasUserLiked exception:', error);
      throw error;
    }
  },

  // Get like count for a beacon
  async getLikeCount(beaconId: number) {
    console.log('📊 getLikeCount called with:', { beaconId });
    
    try {
      const { count, error } = await supabase
        .from('beacon_likes')
        .select('*', { count: 'exact', head: true })
        .eq('beacon_id', beaconId)
      
      console.log('📊 getLikeCount result:', { count, error });
      
      if (error) {
        console.error('❌ getLikeCount error:', error);
        throw error;
      }
      
      const result = count || 0;
      console.log('✅ getLikeCount success:', result);
      return result;
    } catch (error) {
      console.error('❌ getLikeCount exception:', error);
      throw error;
    }
  },

  // Reply to a beacon
  async replyToBeacon(beaconId: number, userWallet: string, content: string) {
    console.log('💬 replyToBeacon called with:', { beaconId, userWallet, content });
    
    try {
      const { data, error } = await supabase
        .from('beacon_replies')
        .insert([{
          beacon_id: beaconId,
          user_wallet: userWallet,
          content: content
        }])
        .select()
        .single()
      
      console.log('💬 replyToBeacon result:', { data, error });
      
      if (error) {
        console.error('❌ replyToBeacon error:', error);
        throw error;
      }
      
      console.log('✅ replyToBeacon success:', data);
      return data;
    } catch (error) {
      console.error('❌ replyToBeacon exception:', error);
      throw error;
    }
  },

  // Get replies for a beacon
  async getBeaconReplies(beaconId: number) {
    const { data, error } = await supabase
      .from('beacon_replies')
      .select('*')
      .eq('beacon_id', beaconId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }
}
