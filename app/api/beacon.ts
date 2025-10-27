import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { createX402Middleware, X402_CONFIG } from '../src/lib/x402';
import { beaconService } from '../src/lib/supabase';

// Initialize Solana connection (using existing QuickNode RPC)
const connection = new Connection(
  'https://small-twilight-sponge.solana-mainnet.quiknode.pro/71bdb31dd3e965467b1393cebaaebe69d481dbeb/',
  'confirmed'
);

// Create x402 middleware
const x402Middleware = createX402Middleware(connection);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Apply x402 payment verification
    await new Promise<void>((resolve, reject) => {
      x402Middleware(req, res, (err?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // If we reach here, payment was verified successfully
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
}

// Export config for Next.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
