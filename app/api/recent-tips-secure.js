const { authMiddleware, sendSecureError } = require('./auth-middleware');
const SecureDatabase = require('./secure-database');
const config = require('./secure-config');

module.exports = async (req, res) => {
  // Apply authentication middleware
  authMiddleware(req, res, () => {
    handleRecentTipsRequest(req, res);
  });
};

async function handleRecentTipsRequest(req, res) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return sendSecureError(res, 405, 'Method not allowed');
    }

    // Validate and sanitize limit parameter
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 tips

    console.log('🔍 Secure recent tips request, limit:', limit);

    // Get recent tips using secure database service
    const tips = await SecureDatabase.getRecentTips(limit);

    // Format the response
    const formattedTips = tips.map(tip => ({
      id: tip.id,
      recipient: tip.recipient,
      amount: parseFloat(tip.amount),
      message: tip.message,
      beaconId: tip.beacon_id,
      tipper: tip.tipper,
      tipperDisplay: tip.tipper_display,
      timestamp: tip.timestamp,
      transaction: tip.treasury_transaction,
      platformWallet: tip.platform_wallet,
      beacon: tip.beacons ? {
        id: tip.beacons.id,
        content: tip.beacons.content,
        topic: tip.beacons.topic,
        authorDisplay: tip.beacons.author_display
      } : null
    }));

    return res.status(200).json({ 
      success: true, 
      tips: formattedTips,
      count: formattedTips.length
    });

  } catch (error) {
    console.error('❌ Secure recent tips API error:', error);
    return sendSecureError(res, 500, 'Failed to fetch recent tips', error);
  }
}
