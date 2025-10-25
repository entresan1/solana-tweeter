import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://voskmcxmtvophehityoa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    const { data, error } = await query
    
    if (error) throw error
    return data || []
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

// User profile service
export const profileService = {
  // Get user profile by wallet address
  async getProfile(walletAddress: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found
    return data
  },

  // Create or update user profile
  async upsertProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>) {
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
    
    if (error) throw error
    return data
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
    const { data, error } = await supabase
      .from('beacon_likes')
      .insert([{
        beacon_id: beaconId,
        user_wallet: userWallet
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Unlike a beacon
  async unlikeBeacon(beaconId: number, userWallet: string) {
    const { error } = await supabase
      .from('beacon_likes')
      .delete()
      .eq('beacon_id', beaconId)
      .eq('user_wallet', userWallet)
    
    if (error) throw error
  },

  // Check if user liked a beacon
  async hasUserLiked(beaconId: number, userWallet: string) {
    const { data, error } = await supabase
      .from('beacon_likes')
      .select('id')
      .eq('beacon_id', beaconId)
      .eq('user_wallet', userWallet)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return !!data
  },

  // Get like count for a beacon
  async getLikeCount(beaconId: number) {
    const { count, error } = await supabase
      .from('beacon_likes')
      .select('*', { count: 'exact', head: true })
      .eq('beacon_id', beaconId)
    
    if (error) throw error
    return count || 0
  },

  // Reply to a beacon
  async replyToBeacon(beaconId: number, userWallet: string, content: string) {
    const { data, error } = await supabase
      .from('beacon_replies')
      .insert([{
        beacon_id: beaconId,
        user_wallet: userWallet,
        content: content
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get replies for a beacon
  async getBeaconReplies(beaconId: number) {
    const { data, error } = await supabase
      .from('beacon_replies')
      .select(`
        *,
        user_profiles!beacon_replies_user_wallet_fkey(nickname, profile_picture_url)
      `)
      .eq('beacon_id', beaconId)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data || []
  }
}
