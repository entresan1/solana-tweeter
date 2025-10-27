// WebSocket service for real-time updates
import { ref, reactive } from 'vue';

// Connection state (simplified for API polling)
const isConnected = ref(false);

// Tweets data
const tweets = ref<any[]>([]);
const newTweetsCount = ref(0);
const lastTweetTimestamp = ref<number>(0);
const isInitialized = ref(false);
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false
});

// Event listeners
const eventListeners = new Map<string, Set<Function>>();

// WebSocket connection (disabled)
let websocket: WebSocket | null = null;

// Current user address for filtering
let currentUserAddress: string | null = null;

/**
 * Connect to WebSocket (disabled - using API polling instead)
 */
export function connectWebSocket() {
  console.log('🔌 WebSocket disabled, using API polling for real-time updates');
  // Add a small delay to ensure the app is fully loaded
  setTimeout(() => {
    loadTweetsDirectly();
  }, 1000);
}

/**
 * Disconnect WebSocket (disabled)
 */
export function disconnectWebSocket() {
  // WebSocket is disabled, just stop polling
  stopPolling();
  isConnected.value = false;
}

/**
 * Fallback function to load tweets directly via API
 */
async function loadTweetsDirectly() {
  try {
    console.log('🔄 Loading tweets directly via API...');
    
    // Try polling endpoint first
    let response = await fetch('/api/tweets-polling?page=1&limit=20');
    let data = await response.json();

    // If polling endpoint fails, try the original tweets-unified endpoint
    if (!data.success) {
      console.log('🔄 Polling endpoint failed, trying tweets-unified...');
      response = await fetch('/api/tweets-unified?page=1&limit=20');
      data = await response.json();
    }

    if (data.success) {
      // Ensure we have a valid array
      const tweetsData = Array.isArray(data.data.tweets) ? data.data.tweets : [];
      tweets.value = tweetsData;
      isInitialized.value = true;

      console.log('✅ Loaded tweets directly:', tweets.value.length);
      
      // Emit event safely
      try {
        emit('tweets_loaded', tweets.value);
      } catch (error) {
        console.error('❌ Error emitting tweets_loaded:', error);
      }
      
      // Start polling for updates every 10 seconds
      startPolling();
    } else {
      console.error('❌ Failed to load tweets directly:', data.message);
    }
  } catch (error) {
    console.error('❌ Error loading tweets directly:', error);
  }
}

/**
 * Start polling for updates when WebSocket is not available
 */
let pollingInterval: NodeJS.Timeout | null = null;

function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  pollingInterval = setInterval(async () => {
    try {
      const lastTweetTime = tweets.value.length > 0 
        ? Math.max(...tweets.value.map(t => new Date(t.created_at).getTime()))
        : 0;
        
      const response = await fetch(`/api/tweets-polling?page=1&limit=20&since=${lastTweetTime}`);
      const data = await response.json();

      if (data.success && data.data.tweets) {
        // Only update if we have new tweets or if this is the first load
        const newTweets = Array.isArray(data.data.tweets) ? data.data.tweets : [];
        if (tweets.value.length === 0 || newTweets.length !== tweets.value.length) {
          tweets.value = newTweets;
          
          // Emit event safely
          try {
            emit('tweets_update', newTweets);
          } catch (error) {
            console.error('❌ Error emitting tweets_update:', error);
          }
          
          console.log('🔄 Polling update:', newTweets.length, 'tweets');
        }
      }
    } catch (error) {
      console.error('❌ Error in polling update:', error);
    }
  }, 10000); // Poll every 10 seconds
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// WebSocket message handling removed - using API polling instead

/**
 * Get current tweets
 */
export function getTweets() {
  return tweets.value;
}

/**
 * Check if WebSocket is initialized
 */
export function isWSInitialized() {
  return isInitialized.value;
}

/**
 * Check if WebSocket is connected
 */
export function isWSConnected() {
  return isConnected.value;
}

/**
 * Set current user address
 */
export function setCurrentUserAddress(address: string | null) {
  currentUserAddress = address;
}

/**
 * Get current user address
 */
export function getCurrentUserAddress() {
  return currentUserAddress;
}

/**
 * Clear new tweets count
 */
export function clearNewTweetsCount() {
  newTweetsCount.value = 0;
}

/**
 * Get new tweets count
 */
export function getNewTweetsCount() {
  return newTweetsCount.value;
}

/**
 * Event emitter
 */
function emit(event: string, data?: any) {
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

// Auto-connect disabled to prevent router errors
// Components will call connectWebSocket() when ready
