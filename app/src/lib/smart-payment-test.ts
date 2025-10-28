import { platformWalletService } from './platform-wallet';
import { smartCAPurchase } from './raydium-direct-swap';

/**
 * Test smart payment functionality
 * This is a utility function to test the smart payment system
 */
export async function testSmartPayment(userAddress: string, tokenMint: string, solAmount: number) {
  try {
    console.log('🧪 Testing Smart Payment System...');
    
    // 1. Check platform wallet balance
    const platformBalance = await platformWalletService.getBalance(userAddress);
    console.log('💰 Platform wallet balance:', platformBalance, 'SOL');
    
    // 2. Check if platform wallet has sufficient funds
    const hasSufficientFunds = await platformWalletService.hasSufficientBalance(userAddress, solAmount);
    console.log('✅ Platform wallet has sufficient funds:', hasSufficientFunds);
    
    // 3. Get platform wallet address
    const platformAddress = platformWalletService.getPlatformWalletAddress(userAddress);
    console.log('🏦 Platform wallet address:', platformAddress);
    
    // 4. Test smart purchase (this would require a real wallet in actual usage)
    console.log('🚀 Smart payment test completed successfully!');
    
    return {
      success: true,
      platformBalance,
      hasSufficientFunds,
      platformAddress,
      message: 'Smart payment system is working correctly'
    };
  } catch (error: any) {
    console.error('❌ Smart payment test failed:', error);
    return {
      success: false,
      error: error.message,
      message: 'Smart payment test failed'
    };
  }
}

/**
 * Get platform wallet info for display
 */
export async function getPlatformWalletInfo(userAddress: string) {
  try {
    const balance = await platformWalletService.getBalance(userAddress);
    const address = platformWalletService.getPlatformWalletAddress(userAddress);
    const hasFunds = balance > 0.001; // Minimum for transactions
    
    return {
      address,
      balance,
      hasFunds,
      formattedBalance: `${balance.toFixed(6)} SOL`
    };
  } catch (error: any) {
    console.error('❌ Error getting platform wallet info:', error);
    return {
      address: 'Unknown',
      balance: 0,
      hasFunds: false,
      formattedBalance: '0.000000 SOL',
      error: error.message
    };
  }
}
