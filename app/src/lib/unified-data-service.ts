import { ref, computed } from 'vue';
import { getBeacons, on, off } from './sse-service';

/**
 * Unified data service that aggregates all data in one place
 * Reduces API calls by batching and caching data
 */
class UnifiedDataService {
  private static instance: UnifiedDataService;
  
  // Cached data
  private beacons = ref<any[]>([]);
  private userProfiles = ref<Map<string, any>>(new Map());
  private likeData = ref<Map<number, { count: number; isLiked: boolean }>>(new Map());
  private rugData = ref<Map<number, { count: number; isRugged: boolean }>>(new Map());
  private tipData = ref<Map<number, any[]>>(new Map());
  private platformBalances = ref<Map<string, number>>(new Map());
  
  // Loading states
  private loading = ref<Set<string>>(new Set());
  
  private constructor() {
    this.initializeSSE();
  }
  
  public static getInstance(): UnifiedDataService {
    if (!UnifiedDataService.instance) {
      UnifiedDataService.instance = new UnifiedDataService();
    }
    return UnifiedDataService.instance;
  }
  
  /**
   * Initialize SSE connection for real-time updates
   */
  private initializeSSE() {
    on('beacons_loaded', (beacons: any[]) => {
      this.beacons.value = beacons;
      this.loadAllBeaconData();
    });
    
    on('new_beacon', (beacon: any) => {
      this.beacons.value.unshift(beacon);
      this.loadBeaconData(beacon.id);
    });
    
    on('beacon_update', (beacon: any) => {
      const index = this.beacons.value.findIndex(b => b.id === beacon.id);
      if (index !== -1) {
        this.beacons.value[index] = beacon;
      }
    });
  }
  
  /**
   * Get all beacons with full data
   */
  public getBeacons() {
    return computed(() => this.beacons.value);
  }
  
  /**
   * Get beacon by ID with all associated data
   */
  public getBeaconWithData(beaconId: number) {
    return computed(() => {
      const beacon = this.beacons.value.find(b => b.id === beaconId);
      if (!beacon) return null;
      
      return {
        ...beacon,
        likeData: this.likeData.value.get(beaconId) || { count: 0, isLiked: false },
        rugData: this.rugData.value.get(beaconId) || { count: 0, isRugged: false },
        tipMessages: this.tipData.value.get(beaconId) || [],
        authorProfile: this.userProfiles.value.get(beacon.author)
      };
    });
  }
  
  /**
   * Load all beacon data in batches to reduce API calls
   */
  private async loadAllBeaconData() {
    const beaconIds = this.beacons.value.map(b => b.id);
    const authorAddresses = [...new Set(this.beacons.value.map(b => b.author))];
    
    // Batch load all data
    await Promise.all([
      this.loadLikeDataBatch(beaconIds),
      this.loadRugDataBatch(beaconIds),
      this.loadTipDataBatch(beaconIds),
      this.loadUserProfilesBatch(authorAddresses)
    ]);
  }
  
  /**
   * Load data for a single beacon
   */
  private async loadBeaconData(beaconId: number) {
    const beacon = this.beacons.value.find(b => b.id === beaconId);
    if (!beacon) return;
    
    await Promise.all([
      this.loadLikeData(beaconId),
      this.loadRugData(beaconId),
      this.loadTipMessages(beaconId),
      this.loadUserProfile(beacon.author)
    ]);
  }
  
  /**
   * Batch load like data for multiple beacons
   */
  private async loadLikeDataBatch(beaconIds: number[]) {
    if (beaconIds.length === 0) return;
    
    try {
      this.loading.value.add('likes');
      
      // Single API call for all beacons
      const response = await fetch(`/api/beacon-likes-batch?beaconIds=${beaconIds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.likes.forEach((like: any) => {
          this.likeData.value.set(like.beacon_id, {
            count: like.count,
            isLiked: like.is_liked
          });
        });
      }
    } catch (error) {
      console.error('Error loading like data batch:', error);
    } finally {
      this.loading.value.delete('likes');
    }
  }
  
  /**
   * Load like data for single beacon
   */
  private async loadLikeData(beaconId: number) {
    try {
      const response = await fetch(`/api/beacon-likes?beaconId=${beaconId}`);
      const data = await response.json();
      
      if (data.success) {
        this.likeData.value.set(beaconId, {
          count: data.count,
          isLiked: data.is_liked
        });
      }
    } catch (error) {
      console.error('Error loading like data:', error);
    }
  }
  
  /**
   * Batch load rug data for multiple beacons
   */
  private async loadRugDataBatch(beaconIds: number[]) {
    if (beaconIds.length === 0) return;
    
    try {
      this.loading.value.add('rugs');
      
      // Single API call for all beacons
      const response = await fetch(`/api/beacon-rugs-batch?beaconIds=${beaconIds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.rugs.forEach((rug: any) => {
          this.rugData.value.set(rug.beacon_id, {
            count: rug.count,
            isRugged: rug.is_rugged
          });
        });
      }
    } catch (error) {
      console.error('Error loading rug data batch:', error);
    } finally {
      this.loading.value.delete('rugs');
    }
  }
  
  /**
   * Load rug data for single beacon
   */
  private async loadRugData(beaconId: number) {
    try {
      const response = await fetch(`/api/beacon-rug-count?beaconId=${beaconId}`);
      const data = await response.json();
      
      if (data.success) {
        this.rugData.value.set(beaconId, {
          count: data.count,
          isRugged: false // We'll implement user-specific rug status later
        });
      }
    } catch (error) {
      console.error('Error loading rug data:', error);
    }
  }
  
  /**
   * Batch load tip messages for multiple beacons
   */
  private async loadTipDataBatch(beaconIds: number[]) {
    if (beaconIds.length === 0) return;
    
    try {
      this.loading.value.add('tips');
      
      // Single API call for all beacons
      const response = await fetch(`/api/beacon-tips-batch?beaconIds=${beaconIds.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.tips.forEach((tip: any) => {
          const existing = this.tipData.value.get(tip.beacon_id) || [];
          existing.push(tip);
          this.tipData.value.set(tip.beacon_id, existing);
        });
      }
    } catch (error) {
      console.error('Error loading tip data batch:', error);
    } finally {
      this.loading.value.delete('tips');
    }
  }
  
  /**
   * Load tip messages for single beacon
   */
  private async loadTipMessages(beaconId: number) {
    try {
      const response = await fetch(`/api/beacon-tip-messages?beaconId=${beaconId}`);
      const data = await response.json();
      
      if (data.success) {
        this.tipData.value.set(beaconId, data.messages || []);
      }
    } catch (error) {
      console.error('Error loading tip messages:', error);
    }
  }
  
  /**
   * Batch load user profiles
   */
  private async loadUserProfilesBatch(addresses: string[]) {
    if (addresses.length === 0) return;
    
    try {
      this.loading.value.add('profiles');
      
      // Single API call for all profiles
      const response = await fetch(`/api/user-profiles-batch?addresses=${addresses.join(',')}`);
      const data = await response.json();
      
      if (data.success) {
        data.profiles.forEach((profile: any) => {
          this.userProfiles.value.set(profile.wallet_address, profile);
        });
      }
    } catch (error) {
      console.error('Error loading user profiles batch:', error);
    } finally {
      this.loading.value.delete('profiles');
    }
  }
  
  /**
   * Load single user profile
   */
  private async loadUserProfile(address: string) {
    if (this.userProfiles.value.has(address)) return;
    
    try {
      const response = await fetch(`/api/user-profile?address=${address}`);
      const data = await response.json();
      
      if (data.success && data.profile) {
        this.userProfiles.value.set(address, data.profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }
  
  /**
   * Get platform wallet balance
   */
  public async getPlatformBalance(userAddress: string): Promise<number> {
    if (this.platformBalances.value.has(userAddress)) {
      return this.platformBalances.value.get(userAddress)!;
    }
    
    try {
      const response = await fetch(`/api/platform-balance?user=${userAddress}`);
      const data = await response.json();
      
      if (data.success) {
        const balance = data.balance || 0;
        this.platformBalances.value.set(userAddress, balance);
        return balance;
      }
    } catch (error) {
      console.error('Error loading platform balance:', error);
    }
    
    return 0;
  }
  
  /**
   * Update platform balance after transaction
   */
  public updatePlatformBalance(userAddress: string, newBalance: number) {
    this.platformBalances.value.set(userAddress, newBalance);
  }
  
  /**
   * Get loading state
   */
  public isLoading(type: string) {
    return computed(() => this.loading.value.has(type));
  }
  
  /**
   * Refresh all data
   */
  public async refreshAll() {
    this.loading.value.clear();
    await this.loadAllBeaconData();
  }
}

// Export singleton instance
export const unifiedDataService = UnifiedDataService.getInstance();
