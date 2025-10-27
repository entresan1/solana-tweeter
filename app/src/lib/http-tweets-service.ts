// Simple HTTP-based tweets service
import { ref } from 'vue';

// Tweets data
const tweets = ref<any[]>([]);
const isInitialized = ref(false);
const isLoading = ref(false);

// Event listeners
const eventListeners = new Map<string, Set<Function>>();

// Polling interval
let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Load tweets from API
 */
async function loadTweets() {
  if (isLoading.value) return;
  
  isLoading.value = true;
  
  try {
    console.log('🔄 Loading tweets via HTTP...');
    
    // Try polling endpoint first
    let response = await fetch('/api/tweets-polling?page=1&limit=20');
    let data = await response.json();

    // If polling endpoint fails, try the original tweets-unified endpoint
    if (!data.success) {
      console.log('🔄 Polling endpoint failed, trying tweets-unified...');
      response = await fetch('/api/tweets-unified?page=1&limit=20');
      data = await response.json();
    }

    if (data.success && Array.isArray(data.data.tweets)) {
      try {
        tweets.value = data.data.tweets;
        isInitialized.value = true;
        console.log('✅ Loaded tweets via HTTP:', tweets.value.length);
        
        // Emit event safely
        emit('tweets_loaded', tweets.value);
      } catch (error) {
        console.error('❌ Error updating tweets data:', error);
      }
    } else {
      console.error('❌ Failed to load tweets:', data.message);
    }
  } catch (error) {
    console.error('❌ Error loading tweets:', error);
  } finally {
    isLoading.value = false;
  }
}

/**
 * Start polling for updates
 */
function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/tweets-polling?page=1&limit=20');
      const data = await response.json();

      if (data.success && Array.isArray(data.data.tweets)) {
        const newTweets = data.data.tweets;
        
        // Only update if tweets have changed
        if (JSON.stringify(newTweets) !== JSON.stringify(tweets.value)) {
          try {
            tweets.value = newTweets;
            emit('tweets_update', newTweets);
            console.log('🔄 HTTP polling update:', newTweets.length, 'tweets');
          } catch (error) {
            console.error('❌ Error updating tweets during polling:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in HTTP polling:', error);
    }
  }, 15000); // Poll every 15 seconds
}

/**
 * Stop polling
 */
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * Initialize the service
 */
export function initializeTweetsService() {
  console.log('🚀 Initializing HTTP tweets service...');
  
  // Delay initialization to let router settle
  setTimeout(() => {
    loadTweets().then(() => {
      startPolling();
    }).catch(error => {
      console.error('❌ Error initializing tweets service:', error);
    });
  }, 100); // 100ms delay
}

/**
 * Get current tweets
 */
export function getTweets() {
  return tweets.value;
}

/**
 * Check if service is initialized
 */
export function isServiceInitialized() {
  return isInitialized.value;
}

/**
 * Check if service is loading
 */
export function isServiceLoading() {
  return isLoading.value;
}

/**
 * Refresh tweets manually
 */
export function refreshTweets() {
  loadTweets();
}

/**
 * Event emitter
 */
function emit(event: string, data?: any) {
  try {
    // Use nextTick to avoid interfering with router
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        try {
          const listeners = eventListeners.get(event);
          if (listeners) {
            listeners.forEach(listener => {
              try {
                listener(data);
              } catch (error) {
                console.error(`❌ Error in event listener for ${event}:`, error);
              }
            });
          }
        } catch (error) {
          console.error(`❌ Error in emit animation frame for ${event}:`, error);
        }
      });
    } else {
      // Fallback for environments without requestAnimationFrame
      const listeners = eventListeners.get(event);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(data);
          } catch (error) {
            console.error(`❌ Error in event listener for ${event}:`, error);
          }
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error emitting event ${event}:`, error);
  }
}

/**
 * Add event listener
 */
export function on(event: string, listener: Function) {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(listener);
}

/**
 * Remove event listener
 */
export function off(event: string, listener: Function) {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.delete(listener);
  }
}

/**
 * Cleanup
 */
export function cleanup() {
  stopPolling();
  eventListeners.clear();
  tweets.value = [];
  isInitialized.value = false;
}
