import { on, off, connectSSE, disconnectSSE, isSSEInitialized } from './sse-service';

/**
 * Debug utility for SSE connection
 */
export class SSEDebug {
  private static instance: SSEDebug;
  private isConnected = false;
  private messageCount = 0;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): SSEDebug {
    if (!SSEDebug.instance) {
      SSEDebug.instance = new SSEDebug();
    }
    return SSEDebug.instance;
  }

  private setupEventListeners() {
    on('connected', (data: any) => {
      console.log('🔌 SSE Connected:', data);
      this.isConnected = true;
    });

    on('new_beacon', (beacon: any) => {
      console.log('📡 New beacon received via SSE:', beacon);
      this.messageCount++;
    });

    on('beacon_update', (beacon: any) => {
      console.log('📡 Beacon update received via SSE:', beacon);
      this.messageCount++;
    });

    on('beacons_loaded', (beacons: any) => {
      console.log('📡 Initial beacons loaded via SSE:', beacons.length, 'beacons');
      this.messageCount++;
    });

    on('ping', (data: any) => {
      console.log('🏓 SSE Ping received:', data);
    });
  }

  public async testConnection() {
    console.log('🧪 Testing SSE connection...');
    
    if (isSSEInitialized()) {
      console.log('✅ SSE is already initialized');
    } else {
      console.log('🔄 Initializing SSE...');
      connectSSE();
      
      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('📊 SSE Status:', {
      isConnected: this.isConnected,
      isInitialized: isSSEInitialized(),
      messageCount: this.messageCount
    });
  }

  public getStatus() {
    return {
      isConnected: this.isConnected,
      isInitialized: isSSEInitialized(),
      messageCount: this.messageCount
    };
  }

  public disconnect() {
    console.log('🔌 Disconnecting SSE for debug...');
    disconnectSSE();
    this.isConnected = false;
  }
}

// Export singleton instance
export const sseDebug = SSEDebug.getInstance();

// Auto-test on load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    sseDebug.testConnection();
  }, 3000);
}
