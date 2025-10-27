import { ref } from 'vue';
import { on, off, getNewTweetsCount, resetNotificationCount as resetSSECount } from './tweets-sse-service';

class NotificationService {
  private static instance: NotificationService;
  private newBeaconCount = ref(0);
  private currentUserAddress: string | null = null;
  private listeners: Array<(count: number) => void> = [];

  private constructor() {
    // Initialize with tweets SSE service count
    this.newBeaconCount.value = getNewTweetsCount();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Subscribe to notification updates
  public subscribe(callback: (count: number) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.newBeaconCount.value));
  }

  // Start periodic checking with SSE integration
  public startPeriodicCheck(currentUserAddress?: string): void {
    console.log('🔔 Starting SSE-based notification service...');
    this.currentUserAddress = currentUserAddress || null;
    
    // Listen for new tweets from SSE
    on('new_tweet', (tweet: any) => {
      // Only count if not from current user
      if (!this.currentUserAddress || tweet.author !== this.currentUserAddress) {
        this.newBeaconCount.value++;
        console.log(`🔔 New tweet notification: ${this.newBeaconCount.value}`);
        this.notifyListeners();
      }
    });

    // Sync with tweets SSE service count
    this.newBeaconCount.value = getNewTweetsCount();
    this.notifyListeners();
  }

  // Stop periodic checking
  public stopPeriodicCheck(): void {
    console.log('🔔 Stopping notification service...');
    // Clean up event listeners
    off('new_tweet', () => {});
  }

  // Reset notification count
  public resetNotificationCount(): void {
    console.log('🔔 Resetting notification count');
    this.newBeaconCount.value = 0;
    resetSSECount();
    this.notifyListeners();
  }

  // Get current notification count
  public getNotificationCount(): number {
    return this.newBeaconCount.value;
  }

  // Update current user address
  public updateCurrentUser(currentUserAddress: string | null): void {
    this.currentUserAddress = currentUserAddress;
  }

  // Get reactive count for Vue components
  public get newBeaconsCount() {
    return this.newBeaconCount;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();