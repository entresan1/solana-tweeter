const express = require('express');
const cors = require('cors');
const { Connection } = require('@solana/web3.js');
const { createX402Middleware } = require('./src/lib/x402');
const { beaconService } = require('./src/lib/supabase');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Solana connection (using existing QuickNode RPC)
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Create x402 middleware
const x402Middleware = createX402Middleware(connection);

// Beacon API endpoint with x402 payment gate
app.post('/api/beacon', x402Middleware, async (req, res) => {
  try {
    const { topic, content, author, author_display } = req.body;

    // Validate required fields
    if (!topic || !content || !author) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'topic, content, and author are required',
      });
    }

    // Create beacon data
    const beaconData = {
      topic,
      content,
      author,
      author_display: author_display || author.slice(0, 8) + '...',
      timestamp: Date.now(),
      treasury_transaction: req.x402Payment?.transaction || 'unknown',
    };

    // Save to Supabase database
    try {
      const savedBeacon = await beaconService.createBeacon(beaconData);
      console.log('✅ Beacon saved to database:', savedBeacon);

      return res.status(200).json({
        success: true,
        message: 'Beacon created successfully',
        beacon: savedBeacon,
        payment: {
          transaction: req.x402Payment?.transaction,
          amount: req.x402Payment?.amount,
        },
      });
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to save beacon to database',
      });
    }
  } catch (error) {
    console.error('❌ Beacon API error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process beacon request',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 x402 Beacon API server running on port ${PORT}`);
  console.log(`💰 Payment required: 0.01 SOL to treasury`);
  console.log(`🌐 Network: Solana Mainnet`);
});

module.exports = app;
