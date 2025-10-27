import { ref, reactive } from 'vue';
import { performanceMonitor } from './performance-monitor';

/**
 * Comprehensive data caching service for optimal performance
 * Reduces API calls by caching all beacon-related data
 */
class DataCache {
  private static instance: DataCache;
  
  // Cache stores
  private beaconCache = new Map<number, any>();
  private profileCache = new Map<string, any>();
  private likeCache = new Map<number, { count: number; isLiked: boolean }>();
  private rugCache = new Map<number, { count: number; isRugged: boolean }>();
  private tipCache = new Map<number, any[]>();
  private replyCache = new Map<number, any[]>();
  
  // Cache timestamps
  private cacheTimestamps = new Map<string, number>();
  
  // Cache TTL (Time To Live) in milliseconds
  private readonly CACHE_TTL = {
    BEACONS: 2 * 60 * 1000,      // 2 minutes
    PROFILES: 10 * 60 * 1000,    // 10 minutes
    LIKES: 30 * 1000,            // 30 seconds
    RUGS: 30 * 1000,             // 30 seconds
    TIPS: 2 * 60 * 1000,         // 2 minutes
    REPLIES: 2 * 60 * 1000       // 2 minutes
  };
  
  // Loading states
  private loadingStates = reactive({
    beacons: false,
    profiles: false,
    likes: false,
    rugs: false,
    tips: false,
    replies: false
  });
  
  // Pending requests to prevent duplicates
  private pendingRequests = new Map<string, Promise<any>>();
  
  private constructor() {}
  
  public static getInstance(): DataCache {
    if (!DataCache.instance) {
      DataCache.instance = new DataCache();
    }
    return DataCache.instance;
  }
  
  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(key: string, ttl: number): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < ttl;
  }
  
  /**
   * Set cache entry with timestamp
   */
  private setCacheEntry(key: string, data: any): void {
    this.cacheTimestamps.set(key, Date.now());
  }
  
  /**
   * Get cached beacons
   */
  public getCachedBeacons(): any[] {
    return Array.from(this.beaconCache.values());
  }
  
  /**
   * Cache beacons data
   */
  public cacheBeacons(beacons: any[]): void {
    beacons.forEach(beacon => {
      this.beaconCache.set(beacon.id, beacon);
    });
    this.setCacheEntry('beacons', beacons);
  }
  
  /**
   * Get cached profile
   */
  public getCachedProfile(walletAddress: string): any | null {
    const cached = this.profileCache.get(walletAddress);
    if (cached) {
      performanceMonitor.recordCacheHit();
    } else {
      performanceMonitor.recordCacheMiss();
    }
    return cached || null;
  }
  
  /**
   * Cache profile data
   */
  public cacheProfile(walletAddress: string, profile: any): void {
    this.profileCache.set(walletAddress, profile);
    this.setCacheEntry(`profile_${walletAddress}`, profile);
  }
  
  /**
   * Get cached likes for beacon
   */
  public getCachedLikes(beaconId: number): { count: number; isLiked: boolean } | null {
    return this.likeCache.get(beaconId) || null;
  }
  
  /**
   * Cache likes data
   */
  public cacheLikes(beaconId: number, likes: { count: number; isLiked: boolean }): void {
    this.likeCache.set(beaconId, likes);
    this.setCacheEntry(`likes_${beaconId}`, likes);
  }
  
  /**
   * Get cached rugs for beacon
   */
  public getCachedRugs(beaconId: number): { count: number; isRugged: boolean } | null {
    return this.rugCache.get(beaconId) || null;
  }
  
  /**
   * Cache rugs data
   */
  public cacheRugs(beaconId: number, rugs: { count: number; isRugged: boolean }): void {
    this.rugCache.set(beaconId, rugs);
    this.setCacheEntry(`rugs_${beaconId}`, rugs);
  }
  
  /**
   * Get cached tips for beacon
   */
  public getCachedTips(beaconId: number): any[] | null {
    return this.tipCache.get(beaconId) || null;
  }
  
  /**
   * Cache tips data
   */
  public cacheTips(beaconId: number, tips: any[]): void {
    this.tipCache.set(beaconId, tips);
    this.setCacheEntry(`tips_${beaconId}`, tips);
  }
  
  /**
   * Get cached replies for beacon
   */
  public getCachedReplies(beaconId: number): any[] | null {
    return this.replyCache.get(beaconId) || null;
  }
  
  /**
   * Cache replies data
   */
  public cacheReplies(beaconId: number, replies: any[]): void {
    this.replyCache.set(beaconId, replies);
    this.setCacheEntry(`replies_${beaconId}`, replies);
  }
  
  /**
   * Check if data is cached and valid
   */
  public isCached(key: string, ttl: number): boolean {
    return this.isCacheValid(key, ttl);
  }
  
  /**
   * Get loading state
   */
  public isLoading(type: keyof typeof this.loadingStates): boolean {
    return this.loadingStates[type];
  }
  
  /**
   * Set loading state
   */
  public setLoading(type: keyof typeof this.loadingStates, loading: boolean): void {
    this.loadingStates[type] = loading;
  }
  
  /**
   * Check if request is pending
   */
  public isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }
  
  /**
   * Set pending request
   */
  public setPending(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, promise);
  }
  
  /**
   * Clear pending request
   */
  public clearPending(key: string): void {
    this.pendingRequests.delete(key);
  }
  
  /**
   * Get pending request
   */
  public getPending(key: string): Promise<any> | undefined {
    return this.pendingRequests.get(key);
  }
  
  /**
   * Clear all caches
   */
  public clearAll(): void {
    this.beaconCache.clear();
    this.profileCache.clear();
    this.likeCache.clear();
    this.rugCache.clear();
    this.tipCache.clear();
    this.replyCache.clear();
    this.cacheTimestamps.clear();
    this.pendingRequests.clear();
  }
  
  /**
   * Clear expired cache entries
   */
  public clearExpired(): void {
    const now = Date.now();
    
    // Clear expired beacons
    if (!this.isCacheValid('beacons', this.CACHE_TTL.BEACONS)) {
      this.beaconCache.clear();
    }
    
    // Clear expired profiles
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (key.startsWith('profile_') && (now - timestamp) > this.CACHE_TTL.PROFILES) {
        const walletAddress = key.replace('profile_', '');
        this.profileCache.delete(walletAddress);
        this.cacheTimestamps.delete(key);
      }
    }
    
    // Clear expired likes
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (key.startsWith('likes_') && (now - timestamp) > this.CACHE_TTL.LIKES) {
        const beaconId = parseInt(key.replace('likes_', ''));
        this.likeCache.delete(beaconId);
        this.cacheTimestamps.delete(key);
      }
    }
    
    // Clear expired rugs
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (key.startsWith('rugs_') && (now - timestamp) > this.CACHE_TTL.RUGS) {
        const beaconId = parseInt(key.replace('rugs_', ''));
        this.rugCache.delete(beaconId);
        this.cacheTimestamps.delete(key);
      }
    }
    
    // Clear expired tips
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (key.startsWith('tips_') && (now - timestamp) > this.CACHE_TTL.TIPS) {
        const beaconId = parseInt(key.replace('tips_', ''));
        this.tipCache.delete(beaconId);
        this.cacheTimestamps.delete(key);
      }
    }
    
    // Clear expired replies
    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (key.startsWith('replies_') && (now - timestamp) > this.CACHE_TTL.REPLIES) {
        const beaconId = parseInt(key.replace('replies_', ''));
        this.replyCache.delete(beaconId);
        this.cacheTimestamps.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  public getStats() {
    return {
      beacons: this.beaconCache.size,
      profiles: this.profileCache.size,
      likes: this.likeCache.size,
      rugs: this.rugCache.size,
      tips: this.tipCache.size,
      replies: this.replyCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// Export singleton instance
export const dataCache = DataCache.getInstance();

// Auto-cleanup expired cache every 5 minutes
setInterval(() => {
  dataCache.clearExpired();
}, 5 * 60 * 1000);
