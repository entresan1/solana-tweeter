import { ref, computed } from 'vue';

// Global notification state
const hasNewBeacons = ref(false);
const lastBeaconCount = ref(0);

// Notification service
export const notificationService = {
  // Check if there are new beacons
  hasNewBeacons: computed(() => hasNewBeacons.value),
  
  // Mark that new beacons are available
  markNewBeaconsAvailable() {
    hasNewBeacons.value = true;
    console.log('🔔 New beacons notification triggered');
  },
  
  // Clear notification (when user refreshes or views new beacons)
  clearNotification() {
    hasNewBeacons.value = false;
    console.log('✅ Notification cleared');
  },
  
  // Update beacon count and check for new beacons
  updateBeaconCount(currentCount: number) {
    if (lastBeaconCount.value > 0 && currentCount > lastBeaconCount.value) {
      // New beacons detected
      this.markNewBeaconsAvailable();
    }
    lastBeaconCount.value = currentCount;
  },
  
  // Initialize with current beacon count
  initialize(initialCount: number) {
    lastBeaconCount.value = initialCount;
    hasNewBeacons.value = false;
  }
};

// Auto-clear notification when page becomes visible (user might have refreshed)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible, clear notification as user might have refreshed
      notificationService.clearNotification();
    }
  });
}
