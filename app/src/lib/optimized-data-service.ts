// Optimized data service for better performance
import { ref, reactive } from 'vue';

// Global cache for all data
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = {
  PROFILES: 10 * 60 * 1000, // 10 minutes
  TIPS: 5 * 60 * 1000, // 5 minutes
  LIKES: 2 * 60 * 1000, // 2 minutes
  RUGS: 2 * 60 * 1000, // 2 minutes
  REPLIES: 5 * 60 * 1000, // 5 minutes
  BEACONS: 1 * 60 * 1000, // 1 minute
};

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

class OptimizedDataService {
  private static instance: OptimizedDataService;

  public static getInstance(): OptimizedDataService {
    if (!OptimizedDataService.instance) {
      OptimizedDataService.instance = new OptimizedDataService();
    }
    return OptimizedDataService.instance;
  }

  // Generic cache getter
  private getCached(key: string): any | null {
    const cached = dataCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      console.log('🎯 Cache hit for:', key);
      return cached.data;
    }
    return null;
  }

  // Generic cache setter
  private setCached(key: string, data: any, ttl: number): void {
    dataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Generic request handler with deduplication
  private async makeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Check cache first
    const cached = this.getCached(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request is already pending
    if (pendingRequests.has(key)) {
      console.log('🎯 Waiting for pending request:', key);
      return await pendingRequests.get(key);
    }

    // Make new request
    const requestPromise = requestFn();
    pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      this.setCached(key, result, ttl);
      return result;
    } finally {
      pendingRequests.delete(key);
    }
  }

  // Get profile with caching
  async getProfile(walletAddress: string): Promise<any> {
    const key = `profile:${walletAddress}`;
    return this.makeRequest(key, async () => {
      const response = await fetch(`/api/user-profiles?walletAddress=${encodeURIComponent(walletAddress)}`);
      const data = await response.json();
      return data.success ? data.profile : null;
    }, CACHE_TTL.PROFILES);
  }

  // Get beacon tips with caching
  async getBeaconTips(beaconId: number): Promise<{ totalTips: number; tipCount: number }> {
    const key = `tips:${beaconId}`;
    return this.makeRequest(key, async () => {
      const response = await fetch(`/api/beacon-tips?beaconId=${beaconId}`);
      const data = await response.json();
      return data.success ? {
        totalTips: parseFloat(data.totalTips) || 0,
        tipCount: data.tipCount || 0
      } : { totalTips: 0, tipCount: 0 };
    }, CACHE_TTL.TIPS);
  }

  // Get like count with caching
  async getLikeCount(beaconId: number): Promise<number> {
    const key = `likes:${beaconId}`;
    return this.makeRequest(key, async () => {
      const response = await fetch(`/api/beacon-interactions?beaconId=${beaconId}`);
      const data = await response.json();
      return data.success ? data.likeCount || 0 : 0;
    }, CACHE_TTL.LIKES);
  }

  // Get rug count with caching
  async getRugCount(beaconId: number): Promise<number> {
    const key = `rugs:${beaconId}`;
    return this.makeRequest(key, async () => {
      const response = await fetch(`/api/beacon-rug-count?beaconId=${beaconId}`);
      const data = await response.json();
      return data.success ? data.count || 0 : 0;
    }, CACHE_TTL.RUGS);
  }

  // Get replies with caching
  async getReplies(beaconId: number): Promise<any[]> {
    const key = `replies:${beaconId}`;
    return this.makeRequest(key, async () => {
      const response = await fetch(`/api/beacon-replies?beaconId=${beaconId}`);
      const data = await response.json();
      return data.success ? data.replies || [] : [];
    }, CACHE_TTL.REPLIES);
  }

  // Batch load data for multiple beacons
  async batchLoadBeaconData(beaconIds: number[]): Promise<Map<number, any>> {
    const results = new Map<number, any>();
    
    // Load all data in parallel
    const promises = beaconIds.map(async (beaconId) => {
      try {
        const [tips, likes, rugs, replies] = await Promise.all([
          this.getBeaconTips(beaconId),
          this.getLikeCount(beaconId),
          this.getRugCount(beaconId),
          this.getReplies(beaconId)
        ]);

        results.set(beaconId, {
          tips,
          likes,
          rugs,
          replies
        });
      } catch (error) {
        console.warn(`Failed to load data for beacon ${beaconId}:`, error);
        results.set(beaconId, {
          tips: { totalTips: 0, tipCount: 0 },
          likes: 0,
          rugs: 0,
          replies: []
        });
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Batch load profiles for multiple addresses
  async batchLoadProfiles(addresses: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    
    // Load profiles in parallel
    const promises = addresses.map(async (address) => {
      try {
        const profile = await this.getProfile(address);
        results.set(address, profile);
      } catch (error) {
        console.warn(`Failed to load profile for ${address}:`, error);
        results.set(address, null);
      }
    });

    await Promise.all(promises);
    return results;
  }

  // Clear cache
  clearCache(): void {
    dataCache.clear();
    pendingRequests.clear();
  }

  // Clear specific cache entry
  clearCacheEntry(key: string): void {
    dataCache.delete(key);
  }

  // Get cache stats
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: dataCache.size,
      entries: Array.from(dataCache.keys())
    };
  }
}

// Export singleton instance
export const optimizedDataService = OptimizedDataService.getInstance();
