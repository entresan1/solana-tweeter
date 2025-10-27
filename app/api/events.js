const treasuryService = require('./treasury-service');

// Store active connections
const connections = new Set();

module.exports = async (req, res) => {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  // Create connection object
  const connection = {
    id: Date.now() + Math.random(),
    res,
    isAlive: true,
  };

  // Add to connections set
  connections.add(connection);

  console.log(`📡 SSE connection established: ${connection.id}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', id: connection.id })}\n\n`);

  // Send initial beacons data
  try {
    const beacons = await treasuryService.getBeacons(20, 0);
    res.write(`data: ${JSON.stringify({ type: 'beacons', data: beacons })}\n\n`);
  } catch (error) {
    console.error('Error sending initial beacons:', error);
  }

  // Handle client disconnect
  req.on('close', () => {
    console.log(`📡 SSE connection closed: ${connection.id}`);
    connections.delete(connection);
  });

  // Keep connection alive with ping
  const pingInterval = setInterval(() => {
    if (connection.isAlive) {
      res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
    } else {
      clearInterval(pingInterval);
      connections.delete(connection);
    }
  }, 30000); // Ping every 30 seconds

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(pingInterval);
    connections.delete(connection);
  });
};

// Function to broadcast to all connections
function broadcast(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  
  connections.forEach(connection => {
    if (connection.isAlive) {
      try {
        connection.res.write(message);
      } catch (error) {
        console.error('Error broadcasting to connection:', error);
        connection.isAlive = false;
        connections.delete(connection);
      }
    }
  });
}

// Function to broadcast new beacon
function broadcastNewBeacon(beacon) {
  broadcast({
    type: 'new_beacon',
    data: beacon
  });
}

// Function to broadcast beacon update
function broadcastBeaconUpdate(beacon) {
  broadcast({
    type: 'beacon_update',
    data: beacon
  });
}

// Export broadcast functions
module.exports.broadcast = broadcast;
module.exports.broadcastNewBeacon = broadcastNewBeacon;
module.exports.broadcastBeaconUpdate = broadcastBeaconUpdate;
