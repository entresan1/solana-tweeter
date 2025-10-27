// WebSocket service for real-time updates
import { ref, reactive } from 'vue';

// WebSocket connection state
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

// WebSocket connection
let websocket: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const RECONNECT_DELAY = 1000; // Start with 1 second

// Current user address for filtering
let currentUserAddress: string | null = null;

/**
 * Connect to WebSocket
 */
export function connectWebSocket() {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected');
    return;
  }

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    websocket = new WebSocket(wsUrl);
    
    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (websocket && websocket.readyState === WebSocket.CONNECTING) {
        console.log('⏰ WebSocket connection timeout, falling back to API');
        websocket.close();
        loadTweetsDirectly();
      }
    }, 3000); // 3 second timeout

    websocket.onopen = () => {
      console.log('🔌 WebSocket connected');
      isConnected.value = true;
      reconnectAttempts = 0;
      clearTimeout(connectionTimeout);
      stopPolling(); // Stop polling when WebSocket connects
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = (event) => {
      console.log('🔌 WebSocket closed:', event.code, event.reason);
      isConnected.value = false;
      
      // Always fallback to API on close - no reconnection attempts
      console.log('🔄 WebSocket closed, falling back to API polling');
      loadTweetsDirectly();
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      isConnected.value = false;
      clearTimeout(connectionTimeout);
      console.log('🔄 WebSocket failed, falling back to API polling...');
      // Fallback to API immediately on error
      loadTweetsDirectly();
    };

  } catch (error) {
    console.error('Failed to create WebSocket connection:', error);
    // Fallback to direct API call
    loadTweetsDirectly();
  }
}

/**
 * Disconnect WebSocket
 */
export function disconnectWebSocket() {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
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
      tweets.value = data.data.tweets || [];
      isInitialized.value = true;

      console.log('✅ Loaded tweets directly:', tweets.value.length);
      emit('tweets_loaded', tweets.value);
      
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
        // Update tweets with new data
        tweets.value = data.data.tweets;
        emit('tweets_update', data.data.tweets);
        console.log('🔄 Polling update:', data.data.tweets.length, 'tweets');
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

/**
 * Handle incoming WebSocket messages
 */
function handleWebSocketMessage(data: any) {
  console.log('📨 WebSocket message received:', data);

  switch (data.type) {
    case 'connected':
      connectionId.value = data.id;
      console.log('✅ WebSocket connected with ID:', data.id);
      break;

    case 'ping':
      lastPing.value = data.timestamp;
      break;

    case 'initial_data':
      console.log('📊 Initial data received:', data.data);
      tweets.value = data.data.tweets || [];
      isInitialized.value = true;

      console.log('📊 Loaded tweets count:', tweets.value.length);

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
      const newTweets = data.data.tweets || [];
      tweets.value = newTweets;

      console.log('🔄 Updated tweets count:', newTweets.length);

      // Update pagination
      Object.assign(pagination, data.data.pagination || {});

      // Check for new tweets (not from current user)
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
      const newTweet = data.data;
      tweets.value.unshift(newTweet);

      // Update notification count (only if not from current user)
      if (!currentUserAddress || newTweet.author !== currentUserAddress) {
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
      const updatedTweet = data.data;
      const index = tweets.value.findIndex(t => t.id === updatedTweet.id);
      if (index !== -1) {
        tweets.value[index] = updatedTweet;
        emit('tweet_update', updatedTweet);
      }
      break;

    default:
      console.log('Unknown WebSocket message type:', data.type);
  }
}

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
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach(listener => listener(data));
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

// Auto-connect on module load with a small delay
if (typeof window !== 'undefined') {
  setTimeout(() => {
    connectWebSocket();
  }, 1000); // 1 second delay to let the page load
}
