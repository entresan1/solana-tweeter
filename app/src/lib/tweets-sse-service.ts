import { ref, reactive } from 'vue';

// SSE connection state
const isConnected = ref(false);
const connectionId = ref<string | null>(null);
const lastPing = ref<number | null>(null);

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

// SSE connection
let eventSource: EventSource | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

/**
 * Connect to tweets SSE stream
 */
export function connectTweetsSSE() {
  if (eventSource && eventSource.readyState === EventSource.OPEN) {
    console.log('Tweets SSE already connected');
    return;
  }

  try {
    const baseUrl = window.location.origin;
    eventSource = new EventSource(`${baseUrl}/api/tweets-sse`);
    
    // Set a timeout to fallback to direct API if SSE doesn't connect quickly
    const connectionTimeout = setTimeout(() => {
      if (!isConnected.value) {
        console.warn('⚠️ SSE connection timeout, falling back to direct API');
        loadTweetsDirectly();
      }
    }, 5000); // 5 second timeout

    eventSource.onopen = () => {
      console.log('📡 Tweets SSE connected');
      console.log('📡 SSE URL:', `${baseUrl}/api/tweets-sse`);
      isConnected.value = true;
      reconnectAttempts = 0;
      clearTimeout(connectionTimeout); // Clear the connection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        console.log('📨 Raw SSE message received:', event.data);
        const data = JSON.parse(event.data);
        handleTweetsSSEMessage(data);
      } catch (error) {
        console.error('❌ Error parsing SSE message:', error);
        console.error('❌ Raw message:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Tweets SSE connection error:', error);
      isConnected.value = false;
      
      // Attempt reconnection
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`🔄 Reconnecting tweets SSE in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          connectTweetsSSE();
        }, delay);
      } else {
        console.error('❌ Max reconnection attempts reached for tweets SSE, falling back to direct API');
        // Fallback to direct API call
        loadTweetsDirectly();
      }
    };

  } catch (error) {
    console.error('Failed to create tweets SSE connection:', error);
    // Fallback to direct API call
    loadTweetsDirectly();
  }
}

/**
 * Fallback function to load tweets directly via API
 */
async function loadTweetsDirectly() {
  try {
    console.log('🔄 Loading tweets directly via API...');
    const response = await fetch('/api/tweets-unified?page=1&limit=20');
    const data = await response.json();
    
    if (data.success) {
      tweets.value = data.data.tweets || [];
      isInitialized.value = true;
      
      console.log('✅ Loaded tweets directly:', tweets.value.length);
      emit('tweets_loaded', tweets.value);
    } else {
      console.error('❌ Failed to load tweets directly:', data.message);
    }
  } catch (error) {
    console.error('❌ Error loading tweets directly:', error);
  }
}

/**
 * Disconnect from tweets SSE stream
 */
export function disconnectTweetsSSE() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  isConnected.value = false;
  connectionId.value = null;
}

/**
 * Handle incoming tweets SSE messages
 */
function handleTweetsSSEMessage(data: any) {
  console.log('📨 Tweets SSE message received:', data);

  switch (data.type) {
    case 'connected':
      connectionId.value = data.id;
      console.log('✅ SSE connected with ID:', data.id);
      break;

    case 'ping':
      lastPing.value = data.timestamp;
      break;

    case 'initial_data':
      console.log('📊 Initial data received:', data.data);
      // Initial tweets load
      tweets.value = data.data.tweets || [];
      isInitialized.value = true;
      
      console.log('📊 Loaded tweets count:', tweets.value.length);
      console.log('📊 First tweet:', tweets.value[0]);
      
      // Update pagination
      Object.assign(pagination, data.data.pagination || {});
      
      if (tweets.value.length > 0) {
        lastTweetTimestamp.value = Math.max(
          ...tweets.value.map((t: any) => 
            typeof t.timestamp === 'number' ? t.timestamp : new Date(t.timestamp).getTime()
          )
        );
      }
      emit('tweets_loaded', tweets.value);
      break;

    case 'tweets_update':
      console.log('🔄 Tweets update received:', data.data);
      // Periodic tweets update (every 5 seconds)
      const newTweets = data.data.tweets || [];
      tweets.value = newTweets;
      
      console.log('🔄 Updated tweets count:', newTweets.length);
      
      // Update pagination
      Object.assign(pagination, data.data.pagination || {});
      
      // Check for new tweets (not from current user)
      const currentUserAddress = getCurrentUserAddress();
      if (currentUserAddress && newTweets.length > 0) {
        const newTweetsFromOthers = newTweets.filter((t: any) => 
          t.author !== currentUserAddress && 
          (typeof t.timestamp === 'number' ? t.timestamp : new Date(t.timestamp).getTime()) > lastTweetTimestamp.value
        );
        
        if (newTweetsFromOthers.length > 0) {
          newTweetsCount.value += newTweetsFromOthers.length;
        }
      }
      
      // Update last tweet timestamp
      if (newTweets.length > 0) {
        const maxTime = Math.max(
          ...newTweets.map((t: any) => 
            typeof t.timestamp === 'number' ? t.timestamp : new Date(t.timestamp).getTime()
          )
        );
        lastTweetTimestamp.value = Math.max(lastTweetTimestamp.value, maxTime);
      }
      
      emit('tweets_update', newTweets);
      break;

    case 'new_tweet':
      // New tweet received
      const newTweet = data.data;
      tweets.value.unshift(newTweet);
      
      // Update notification count (only if not from current user)
      const currentUser = getCurrentUserAddress();
      if (!currentUser || newTweet.author !== currentUser) {
        newTweetsCount.value++;
      }
      
      // Update last tweet timestamp
      const tweetTime = typeof newTweet.timestamp === 'number' 
        ? newTweet.timestamp 
        : new Date(newTweet.timestamp).getTime();
      lastTweetTimestamp.value = Math.max(lastTweetTimestamp.value, tweetTime);
      
      emit('new_tweet', newTweet);
      break;

    case 'tweet_update':
      // Tweet updated
      const updatedTweet = data.data;
      const index = tweets.value.findIndex(t => t.id === updatedTweet.id);
      if (index !== -1) {
        tweets.value[index] = updatedTweet;
        emit('tweet_update', updatedTweet);
      }
      break;

    default:
      console.log('Unknown tweets SSE message type:', data.type);
  }
}

// Store current user address
let currentUserAddress: string | null = null;

/**
 * Set current user address
 */
export function setCurrentUserAddress(address: string | null) {
  currentUserAddress = address;
}

/**
 * Get current user address
 */
function getCurrentUserAddress(): string | null {
  return currentUserAddress;
}

/**
 * Add event listener
 */
export function on(event: string, callback: Function) {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);
}

/**
 * Remove event listener
 */
export function off(event: string, callback: Function) {
  if (eventListeners.has(event)) {
    eventListeners.get(event)!.delete(callback);
  }
}

/**
 * Emit event to listeners
 */
function emit(event: string, data?: any) {
  if (eventListeners.has(event)) {
    eventListeners.get(event)!.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in tweets SSE event listener:', error);
      }
    });
  }
}

/**
 * Reset notification count
 */
export function resetNotificationCount() {
  newTweetsCount.value = 0;
}

/**
 * Get tweets (reactive)
 */
export function getTweets() {
  return tweets.value;
}

/**
 * Get beacons (for backward compatibility)
 */
export function getBeacons() {
  return tweets.value;
}

/**
 * Check if SSE is initialized
 */
export function isSSEInitialized() {
  return isInitialized.value;
}

/**
 * Get new tweets count (reactive)
 */
export function getNewTweetsCount() {
  return newTweetsCount.value;
}

/**
 * Get new beacons count (for backward compatibility)
 */
export function getNewBeaconsCount() {
  return newTweetsCount.value;
}

/**
 * Get pagination info
 */
export function getPagination() {
  return pagination;
}

/**
 * Set pagination
 */
export function setPagination(page: number, limit: number) {
  pagination.page = page;
  pagination.limit = limit;
}

/**
 * Get connection status (reactive)
 */
export function getConnectionStatus() {
  return {
    isConnected: isConnected.value,
    connectionId: connectionId.value,
    lastPing: lastPing.value
  };
}

// Auto-connect when module loads
if (typeof window !== 'undefined') {
  // Delay connection to ensure DOM is ready
  setTimeout(() => {
    console.log('🔌 Auto-connecting tweets SSE...');
    connectTweetsSSE();
  }, 1000);
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    disconnectTweetsSSE();
  });
}
