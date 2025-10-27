import { dataCache } from './data-cache';
import { performanceMonitor } from './performance-monitor';

/**
 * Batch API service to reduce server requests
 * Groups multiple API calls into single requests
 */
class BatchAPIService {
  private static instance: BatchAPIService;
  
  // Batch queues
  private profileQueue = new Set<string>();
  private likesQueue = new Set<number>();
  private rugsQueue = new Set<number>();
  private tipsQueue = new Set<number>();
  private repliesQueue = new Set<number>();
  
  // Batch timers
  private batchTimers = new Map<string, NodeJS.Timeout>();
  
  // Batch delays (ms)
  private readonly BATCH_DELAYS = {
    PROFILES: 100,    // 100ms
    LIKES: 50,        // 50ms
    RUGS: 50,         // 50ms
    TIPS: 100,        // 100ms
    REPLIES: 100      // 100ms
  };
  
  private constructor() {}
  
  public static getInstance(): BatchAPIService {
    if (!BatchAPIService.instance) {
      BatchAPIService.instance = new BatchAPIService();
    }
    return BatchAPIService.instance;
  }
  
  /**
   * Queue profile request for batching
   */
  public async getProfile(walletAddress: string): Promise<any> {
    // Check cache first
    const cached = dataCache.getCachedProfile(walletAddress);
    if (cached && dataCache.isCached(`profile_${walletAddress}`, 10 * 60 * 1000)) {
      return cached;
    }
    
    // Check if already pending
    const pendingKey = `profile_${walletAddress}`;
    if (dataCache.isPending(pendingKey)) {
      return await dataCache.getPending(pendingKey);
    }
    
    // Add to batch queue
    this.profileQueue.add(walletAddress);
    
    // Create promise for this specific request
    const promise = new Promise<any>((resolve) => {
      const checkResult = () => {
        const result = dataCache.getCachedProfile(walletAddress);
        if (result) {
          resolve(result);
        } else {
          setTimeout(checkResult, 50);
        }
      };
      checkResult();
    });
    
    dataCache.setPending(pendingKey, promise);
    
    // Schedule batch processing
    this.scheduleBatch('profiles');
    
    return promise;
  }
  
  /**
   * Queue likes request for batching
   */
  public async getLikes(beaconId: number): Promise<{ count: number; isLiked: boolean }> {
    // Check cache first
    const cached = dataCache.getCachedLikes(beaconId);
    if (cached && dataCache.isCached(`likes_${beaconId}`, 30 * 1000)) {
      return cached;
    }
    
    // Check if already pending
    const pendingKey = `likes_${beaconId}`;
    if (dataCache.isPending(pendingKey)) {
      return await dataCache.getPending(pendingKey);
    }
    
    // Add to batch queue
    this.likesQueue.add(beaconId);
    
    // Create promise for this specific request
    const promise = new Promise<{ count: number; isLiked: boolean }>((resolve) => {
      const checkResult = () => {
        const result = dataCache.getCachedLikes(beaconId);
        if (result) {
          resolve(result);
        } else {
          setTimeout(checkResult, 25);
        }
      };
      checkResult();
    });
    
    dataCache.setPending(pendingKey, promise);
    
    // Schedule batch processing
    this.scheduleBatch('likes');
    
    return promise;
  }
  
  /**
   * Queue rugs request for batching
   */
  public async getRugs(beaconId: number): Promise<{ count: number; isRugged: boolean }> {
    // Check cache first
    const cached = dataCache.getCachedRugs(beaconId);
    if (cached && dataCache.isCached(`rugs_${beaconId}`, 30 * 1000)) {
      return cached;
    }
    
    // Check if already pending
    const pendingKey = `rugs_${beaconId}`;
    if (dataCache.isPending(pendingKey)) {
      return await dataCache.getPending(pendingKey);
    }
    
    // Add to batch queue
    this.rugsQueue.add(beaconId);
    
    // Create promise for this specific request
    const promise = new Promise<{ count: number; isRugged: boolean }>((resolve) => {
      const checkResult = () => {
        const result = dataCache.getCachedRugs(beaconId);
        if (result) {
          resolve(result);
        } else {
          setTimeout(checkResult, 25);
        }
      };
      checkResult();
    });
    
    dataCache.setPending(pendingKey, promise);
    
    // Schedule batch processing
    this.scheduleBatch('rugs');
    
    return promise;
  }
  
  /**
   * Queue tips request for batching
   */
  public async getTips(beaconId: number): Promise<any[]> {
    // Check cache first
    const cached = dataCache.getCachedTips(beaconId);
    if (cached && dataCache.isCached(`tips_${beaconId}`, 2 * 60 * 1000)) {
      return cached;
    }
    
    // Check if already pending
    const pendingKey = `tips_${beaconId}`;
    if (dataCache.isPending(pendingKey)) {
      return await dataCache.getPending(pendingKey);
    }
    
    // Add to batch queue
    this.tipsQueue.add(beaconId);
    
    // Create promise for this specific request
    const promise = new Promise<any[]>((resolve) => {
      const checkResult = () => {
        const result = dataCache.getCachedTips(beaconId);
        if (result) {
          resolve(result);
        } else {
          setTimeout(checkResult, 50);
        }
      };
      checkResult();
    });
    
    dataCache.setPending(pendingKey, promise);
    
    // Schedule batch processing
    this.scheduleBatch('tips');
    
    return promise;
  }
  
  /**
   * Queue replies request for batching
   */
  public async getReplies(beaconId: number): Promise<any[]> {
    // Check cache first
    const cached = dataCache.getCachedReplies(beaconId);
    if (cached && dataCache.isCached(`replies_${beaconId}`, 2 * 60 * 1000)) {
      return cached;
    }
    
    // Check if already pending
    const pendingKey = `replies_${beaconId}`;
    if (dataCache.isPending(pendingKey)) {
      return await dataCache.getPending(pendingKey);
    }
    
    // Add to batch queue
    this.repliesQueue.add(beaconId);
    
    // Create promise for this specific request
    const promise = new Promise<any[]>((resolve) => {
      const checkResult = () => {
        const result = dataCache.getCachedReplies(beaconId);
        if (result) {
          resolve(result);
        } else {
          setTimeout(checkResult, 50);
        }
      };
      checkResult();
    });
    
    dataCache.setPending(pendingKey, promise);
    
    // Schedule batch processing
    this.scheduleBatch('replies');
    
    return promise;
  }
  
  /**
   * Schedule batch processing
   */
  private scheduleBatch(type: string): void {
    // Clear existing timer
    if (this.batchTimers.has(type)) {
      clearTimeout(this.batchTimers.get(type)!);
    }
    
    // Set new timer
    const delay = this.BATCH_DELAYS[type as keyof typeof this.BATCH_DELAYS];
    const timer = setTimeout(() => {
      this.processBatch(type);
    }, delay);
    
    this.batchTimers.set(type, timer);
  }
  
  /**
   * Process batched requests
   */
  private async processBatch(type: string): Promise<void> {
    try {
      dataCache.setLoading(type as any, true);
      
      switch (type) {
        case 'profiles':
          await this.processProfilesBatch();
          break;
        case 'likes':
          await this.processLikesBatch();
          break;
        case 'rugs':
          await this.processRugsBatch();
          break;
        case 'tips':
          await this.processTipsBatch();
          break;
        case 'replies':
          await this.processRepliesBatch();
          break;
      }
    } catch (error) {
      console.error(`Error processing ${type} batch:`, error);
    } finally {
      dataCache.setLoading(type as any, false);
      this.batchTimers.delete(type);
    }
  }
  
  /**
   * Process profiles batch
   */
  private async processProfilesBatch(): Promise<void> {
    if (this.profileQueue.size === 0) return;
    
    const addresses = Array.from(this.profileQueue);
    this.profileQueue.clear();
    
    performanceMonitor.startTimer('profiles_batch');
    performanceMonitor.recordBatchRequest();
    
    try {
      const response = await fetch(`/api/user-profiles-batch?addresses=${addresses.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.profiles.forEach((profile: any) => {
          dataCache.cacheProfile(profile.wallet_address, profile);
          dataCache.clearPending(`profile_${profile.wallet_address}`);
        });
        
        // Cache null for missing profiles
        addresses.forEach(address => {
          if (!data.profiles.find((p: any) => p.wallet_address === address)) {
            dataCache.cacheProfile(address, null);
            dataCache.clearPending(`profile_${address}`);
          }
        });
        
        performanceMonitor.recordAPICall();
      }
    } catch (error) {
      console.error('Error fetching profiles batch:', error);
      // Fallback to individual profile requests
      console.log('🔄 Falling back to individual profile requests...');
      for (const address of addresses) {
        try {
          const response = await fetch(`/api/user-profiles?walletAddress=${encodeURIComponent(address)}`);
          const data = await response.json();
          if (data.success) {
            dataCache.cacheProfile(address, data.profile);
          } else {
            dataCache.cacheProfile(address, null);
          }
        } catch (fallbackError) {
          console.warn(`Failed to fetch profile for ${address}:`, fallbackError);
          dataCache.cacheProfile(address, null);
        }
        dataCache.clearPending(`profile_${address}`);
      }
    } finally {
      const duration = performanceMonitor.endTimer('profiles_batch');
      console.log(`📊 Profiles batch processed in ${duration.toFixed(2)}ms for ${addresses.length} addresses`);
    }
  }
  
  /**
   * Process likes batch
   */
  private async processLikesBatch(): Promise<void> {
    if (this.likesQueue.size === 0) return;
    
    const beaconIds = Array.from(this.likesQueue);
    this.likesQueue.clear();
    
    try {
      const response = await fetch(`/api/beacon-likes-batch?beaconIds=${beaconIds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.likes.forEach((like: any) => {
          dataCache.cacheLikes(like.beacon_id, {
            count: like.count,
            isLiked: like.isLiked
          });
          dataCache.clearPending(`likes_${like.beacon_id}`);
        });
      }
    } catch (error) {
      console.error('Error fetching likes batch:', error);
      // Clear pending requests
      beaconIds.forEach(beaconId => {
        dataCache.clearPending(`likes_${beaconId}`);
      });
    }
  }
  
  /**
   * Process rugs batch
   */
  private async processRugsBatch(): Promise<void> {
    if (this.rugsQueue.size === 0) return;
    
    const beaconIds = Array.from(this.rugsQueue);
    this.rugsQueue.clear();
    
    try {
      const response = await fetch(`/api/beacon-rugs-batch?beaconIds=${beaconIds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.rugs.forEach((rug: any) => {
          dataCache.cacheRugs(rug.beacon_id, {
            count: rug.count,
            isRugged: rug.isRugged
          });
          dataCache.clearPending(`rugs_${rug.beacon_id}`);
        });
      }
    } catch (error) {
      console.error('Error fetching rugs batch:', error);
      // Clear pending requests
      beaconIds.forEach(beaconId => {
        dataCache.clearPending(`rugs_${beaconId}`);
      });
    }
  }
  
  /**
   * Process tips batch
   */
  private async processTipsBatch(): Promise<void> {
    if (this.tipsQueue.size === 0) return;
    
    const beaconIds = Array.from(this.tipsQueue);
    this.tipsQueue.clear();
    
    try {
      const response = await fetch(`/api/beacon-tips-batch?beaconIds=${beaconIds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.tips.forEach((tip: any) => {
          dataCache.cacheTips(tip.beacon_id, tip.messages || []);
          dataCache.clearPending(`tips_${tip.beacon_id}`);
        });
      }
    } catch (error) {
      console.error('Error fetching tips batch:', error);
      // Clear pending requests
      beaconIds.forEach(beaconId => {
        dataCache.clearPending(`tips_${beaconId}`);
      });
    }
  }
  
  /**
   * Process replies batch
   */
  private async processRepliesBatch(): Promise<void> {
    if (this.repliesQueue.size === 0) return;
    
    const beaconIds = Array.from(this.repliesQueue);
    this.repliesQueue.clear();
    
    try {
      const response = await fetch(`/api/beacon-replies-batch?beaconIds=${beaconIds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.replies.forEach((reply: any) => {
          dataCache.cacheReplies(reply.beacon_id, reply.messages || []);
          dataCache.clearPending(`replies_${reply.beacon_id}`);
        });
      }
    } catch (error) {
      console.error('Error fetching replies batch:', error);
      // Clear pending requests
      beaconIds.forEach(beaconId => {
        dataCache.clearPending(`replies_${beaconId}`);
      });
    }
  }
  
  /**
   * Clear all queues and timers
   */
  public clearAll(): void {
    this.profileQueue.clear();
    this.likesQueue.clear();
    this.rugsQueue.clear();
    this.tipsQueue.clear();
    this.repliesQueue.clear();
    
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();
  }
}

// Export singleton instance
export const batchAPIService = BatchAPIService.getInstance();
