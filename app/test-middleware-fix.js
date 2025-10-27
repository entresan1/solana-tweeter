const { secureAuthMiddleware } = require('./api/secure-auth-middleware');

// Mock request and response objects
const mockReq = {
  method: 'GET',
  url: '/api/user-profiles?walletAddress=test123',
  headers: {
    'cookie': 'XSRF-TOKEN=test-token; other=value',
    'origin': 'https://trenchbeacon.com'
  },
  query: {
    walletAddress: 'test123'
  },
  body: {},
  connection: {
    remoteAddress: '127.0.0.1'
  },
  socket: {
    remoteAddress: '127.0.0.1'
  }
};

const mockRes = {
  headers: {},
  setHeader: function(name, value) {
    this.headers[name] = value;
    console.log(`Set header: ${name} = ${value}`);
  },
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log(`JSON response (${this.statusCode}):`, data);
    return this;
  },
  end: function() {
    console.log('Response ended');
  }
};

console.log('Testing middleware fix...');
console.log('Request headers:', mockReq.headers);
console.log('Request cookies before:', mockReq.cookies);

// Test the middleware
secureAuthMiddleware(mockReq, mockRes, () => {
  console.log('Middleware completed successfully');
  console.log('Request cookies after:', mockReq.cookies);
  console.log('Response headers:', mockRes.headers);
  console.log('Security context:', mockReq.securityContext);
});

console.log('Test completed');
