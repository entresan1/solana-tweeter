import { beaconService } from './supabase';

// Notification service for tracking new beacons
export class NotificationService {
  private static instance: NotificationService;
  private lastBeaconTimestamp: number = 0;
  private newBeaconCount: number = 0;
  private listeners: Array<(count: number) => void> = [];

  private constructor() {
    // Initialize with current timestamp
    this.lastBeaconTimestamp = Date.now();
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
    this.listeners.forEach(callback => callback(this.newBeaconCount));
  }

  // Check for new beacons
  public async checkForNewBeacons(): Promise<void> {
    try {
      console.log('🔔 Checking for new beacons...');
      
      // Fetch recent beacons
      const beacons = await beaconService.fetchBeacons();
      
      // Count beacons newer than our last check
      const newBeacons = beacons.filter(beacon => {
        const beaconTime = typeof beacon.timestamp === 'number' 
          ? beacon.timestamp 
          : new Date(beacon.timestamp).getTime();
        return beaconTime > this.lastBeaconTimestamp;
      });

      if (newBeacons.length > 0) {
        console.log(`🔔 Found ${newBeacons.length} new beacons!`);
        this.newBeaconCount += newBeacons.length;
        this.notifyListeners();
      }

      // Update timestamp to the latest beacon
      if (beacons.length > 0) {
        const latestBeacon = beacons[0]; // They're ordered by timestamp desc
        const latestTime = typeof latestBeacon.timestamp === 'number' 
          ? latestBeacon.timestamp 
          : new Date(latestBeacon.timestamp).getTime();
        this.lastBeaconTimestamp = latestTime;
      }
    } catch (error) {
      console.error('❌ Error checking for new beacons:', error);
    }
  }

  // Reset notification count (when user refreshes or visits home)
  public resetNotificationCount(): void {
    console.log('🔔 Resetting notification count');
    this.newBeaconCount = 0;
    this.notifyListeners();
  }

  // Get current notification count
  public getNotificationCount(): number {
    return this.newBeaconCount;
  }

  // Start periodic checking (every 30 seconds)
  public startPeriodicCheck(): void {
    console.log('🔔 Starting periodic beacon check...');
    setInterval(() => {
      this.checkForNewBeacons();
    }, 30000); // Check every 30 seconds
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
