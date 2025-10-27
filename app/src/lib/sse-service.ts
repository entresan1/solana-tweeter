import { ref, reactive } from 'vue';

// SSE connection state
const isConnected = ref(false);
const connectionId = ref<string | null>(null);
const lastPing = ref<number | null>(null);

// Beacons data
const beacons = ref<any[]>([]);
const newBeaconsCount = ref(0);
const lastBeaconTimestamp = ref<number>(0);

// Event listeners
const eventListeners = new Map<string, Set<Function>>();

// SSE connection
let eventSource: EventSource | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

/**
 * Connect to SSE stream
 */
export function connectSSE() {
  if (eventSource && eventSource.readyState === EventSource.OPEN) {
    console.log('SSE already connected');
    return;
  }

  try {
    const baseUrl = window.location.origin;
    eventSource = new EventSource(`${baseUrl}/api/events`);

    eventSource.onopen = () => {
      console.log('📡 SSE connected');
      isConnected.value = true;
      reconnectAttempts = 0;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSSEMessage(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      isConnected.value = false;
      
      // Attempt reconnection
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          connectSSE();
        }, delay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };

  } catch (error) {
    console.error('Failed to create SSE connection:', error);
  }
}

/**
 * Disconnect from SSE stream
 */
export function disconnectSSE() {
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
 * Handle incoming SSE messages
 */
function handleSSEMessage(data: any) {
  console.log('📨 SSE message received:', data);

  switch (data.type) {
    case 'connected':
      connectionId.value = data.id;
      break;

    case 'ping':
      lastPing.value = data.timestamp;
      break;

    case 'beacons':
      // Initial beacons load
      beacons.value = data.data || [];
      if (beacons.value.length > 0) {
        lastBeaconTimestamp.value = Math.max(
          ...beacons.value.map(b => 
            typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp).getTime()
          )
        );
      }
      emit('beacons_loaded', beacons.value);
      break;

    case 'new_beacon':
      // New beacon received
      const newBeacon = data.data;
      beacons.value.unshift(newBeacon);
      
      // Update notification count (only if not from current user)
      const currentUserAddress = getCurrentUserAddress();
      if (!currentUserAddress || newBeacon.author !== currentUserAddress) {
        newBeaconsCount.value++;
      }
      
      // Update last beacon timestamp
      const beaconTime = typeof newBeacon.timestamp === 'number' 
        ? newBeacon.timestamp 
        : new Date(newBeacon.timestamp).getTime();
      lastBeaconTimestamp.value = Math.max(lastBeaconTimestamp.value, beaconTime);
      
      emit('new_beacon', newBeacon);
      break;

    case 'beacon_update':
      // Beacon updated
      const updatedBeacon = data.data;
      const index = beacons.value.findIndex(b => b.id === updatedBeacon.id);
      if (index !== -1) {
        beacons.value[index] = updatedBeacon;
        emit('beacon_update', updatedBeacon);
      }
      break;

    default:
      console.log('Unknown SSE message type:', data.type);
  }
}

/**
 * Get current user address (you'll need to implement this based on your wallet setup)
 */
function getCurrentUserAddress(): string | null {
  // This should return the current connected wallet address
  // You'll need to integrate with your wallet service
  return null; // Placeholder
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
        console.error('Error in event listener:', error);
      }
    });
  }
}

/**
 * Reset notification count
 */
export function resetNotificationCount() {
  newBeaconsCount.value = 0;
}

/**
 * Get beacons (reactive)
 */
export function getBeacons() {
  return beacons.value;
}

/**
 * Get new beacons count (reactive)
 */
export function getNewBeaconsCount() {
  return newBeaconsCount.value;
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
  connectSSE();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    disconnectSSE();
  });
}
