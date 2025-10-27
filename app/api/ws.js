const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://voskmcxmtvophehityoa.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvc2ttY3htdHZvcGhlaGl0eW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTI1MDQsImV4cCI6MjA3NDEyODUwNH0.4sZOl1G7ZgCh0R_VSAULPm-KuPtLQ-013ivFn19VYVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Store active connections
const connections = new Set();

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  connections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Send initial data to a client
async function sendInitialData(ws) {
  try {
    console.log('📊 Sending initial data to WebSocket client');
    
    // Fetch beacons from database
    const { data: beacons, error } = await supabase
      .from('beacons')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching beacons:', error);
      return;
    }

    const data = {
      type: 'initial_data',
      data: {
        tweets: beacons || [],
        pagination: {
          page: 1,
          limit: 20,
          total: beacons?.length || 0,
          totalPages: Math.ceil((beacons?.length || 0) / 20),
          hasNext: false,
          hasPrev: false
        }
      },
      timestamp: Date.now()
    };

    ws.send(JSON.stringify(data));
    console.log('✅ Initial data sent to WebSocket client');
  } catch (error) {
    console.error('❌ Error sending initial data:', error);
  }
}

// WebSocket server
const wss = new WebSocket.Server({ 
  port: process.env.WS_PORT || 8080,
  path: '/api/ws'
});

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection');
  connections.add(ws);

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now()
  }));

  // Send initial data
  sendInitialData(ws);

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 WebSocket message received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    connections.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    connections.delete(ws);
  });
});

// Periodic updates (every 5 seconds)
setInterval(async () => {
  if (connections.size > 0) {
    try {
      console.log('🔄 Sending periodic update to', connections.size, 'clients');
      
      // Fetch latest beacons
      const { data: beacons, error } = await supabase
        .from('beacons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Error fetching beacons for update:', error);
        return;
      }

      const data = {
        type: 'tweets_update',
        data: {
          tweets: beacons || [],
          pagination: {
            page: 1,
            limit: 20,
            total: beacons?.length || 0,
            totalPages: Math.ceil((beacons?.length || 0) / 20),
            hasNext: false,
            hasPrev: false
          }
        },
        timestamp: Date.now()
      };

      broadcast(data);
    } catch (error) {
      console.error('❌ Error in periodic update:', error);
    }
  }
}, 5000);

// Ping clients every 30 seconds
setInterval(() => {
  if (connections.size > 0) {
    broadcast({
      type: 'ping',
      timestamp: Date.now()
    });
  }
}, 30000);

console.log('🔌 WebSocket server started on port', process.env.WS_PORT || 8080);

module.exports = wss;
