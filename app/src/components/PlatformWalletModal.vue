<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { platformWalletService } from '@src/lib/platform-wallet';
import { getPlatformPortfolio } from '../lib/portfolio-api';

interface Token {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  price?: number;
  value?: number;
}

interface PortfolioData {
  tokens: Token[];
  totalValue: number;
  walletAddress: string;
  privateKey: string;
}

const { wallet } = useWallet();
const showModal = ref(false);
const showPrivateKey = ref(false);
const portfolio = ref<PortfolioData | null>(null);
const loading = ref(false);
const error = ref('');

// Deposit functionality
const showDeposit = ref(false);
const depositAmount = ref('');
const isDepositing = ref(false);
const depositError = ref('');

// Computed properties
const hasTokens = computed(() => portfolio.value?.tokens && portfolio.value.tokens.length > 0);
const totalValueFormatted = computed(() => 
  portfolio.value?.totalValue ? `$${portfolio.value.totalValue.toFixed(2)}` : '$0.00'
);

// Load portfolio data
const loadPortfolio = async () => {
  if (!wallet.value?.publicKey) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const userAddress = wallet.value.publicKey.toBase58();
    const platformAddress = platformWalletService.getPlatformWalletAddress(userAddress);
    
    console.log('Loading portfolio for platform wallet:', platformAddress);
    
    // Use the robust portfolio API with platform wallet address
    const data = await getPlatformPortfolio(platformAddress);
    
    // Convert the new API response format to our expected format
    const tokens = data.items.map((item: any) => ({
      mint: item.mint,
      symbol: item.symbol || 'UNKNOWN',
      name: item.symbol || 'Unknown Token',
      balance: item.uiAmount || 0,
      decimals: 9, // Default decimals
      price: item.usdValue ? (item.usdValue / (item.uiAmount || 1)) : 0,
      value: item.usdValue || 0
    }));
    
    const totalValue = tokens.reduce((sum: number, token: any) => sum + token.value, 0);
    
    // Generate platform wallet to get private key
    const platformWallet = platformWalletService.generatePlatformWallet(userAddress);
    
    portfolio.value = {
      tokens,
      totalValue,
      walletAddress: platformAddress,
      privateKey: Buffer.from(platformWallet.keypair.secretKey).toString('base64')
    };
  } catch (err: any) {
    console.error('Portfolio load error:', err);
    error.value = err.message || 'Failed to load portfolio';
  } finally {
    loading.value = false;
  }
};

// Copy to clipboard
const copyToClipboard = async (text: string, type: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // You could add a toast notification here
    console.log(`${type} copied to clipboard`);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

// Deposit functions
const openDeposit = () => {
  showDeposit.value = true;
  depositAmount.value = '';
  depositError.value = '';
};

const closeDeposit = () => {
  showDeposit.value = false;
  depositAmount.value = '';
  depositError.value = '';
};

const handleDeposit = async () => {
  if (!wallet.value?.publicKey || !depositAmount.value) return;
  
  const amount = parseFloat(depositAmount.value);
  if (isNaN(amount) || amount <= 0) {
    depositError.value = 'Please enter a valid amount';
    return;
  }
  
  isDepositing.value = true;
  depositError.value = '';
  
  try {
    const userAddress = wallet.value.publicKey.toBase58();
    const platformAddress = platformWalletService.getPlatformWalletAddress(userAddress);
    
    // Use the existing platform deposit service
    const { depositToPlatformWallet } = await import('@src/lib/x402-platform-client');
    
    const result = await depositToPlatformWallet(wallet.value, platformAddress, amount);
    
    if (result.success) {
      console.log('Deposit successful:', result);
      closeDeposit();
      // Reload portfolio to show updated balance
      await loadPortfolio();
    } else {
      depositError.value = result.error || 'Deposit failed';
    }
  } catch (err) {
    console.error('Deposit error:', err);
    depositError.value = 'Deposit failed. Please try again.';
  } finally {
    isDepositing.value = false;
  }
};

// Portfolio is now read-only - no buy/sell functions needed

// Watch for wallet changes
watch(wallet, (newWallet) => {
  if (newWallet?.publicKey && showModal.value) {
    loadPortfolio();
  }
});

// Expose methods to parent
defineExpose({
  open: () => {
    showModal.value = true;
    if (wallet.value?.publicKey) {
      loadPortfolio();
    }
  },
  close: () => {
    showModal.value = false;
    showPrivateKey.value = false;
  }
});
</script>

<template>
  <!-- Modal Overlay -->
  <div 
    v-if="showModal" 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="showModal = false"
  >
    <!-- Modal Content -->
    <div class="bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl border border-dark-700/50 w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl backdrop-blur-xl">
      <!-- Enhanced Header -->
      <div class="flex items-center justify-between p-6 border-b border-dark-700/50 bg-gradient-to-r from-primary-500/5 to-solana-500/5">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-gradient-to-r from-primary-500 to-solana-500 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">Platform Wallet Portfolio</h2>
            <p class="text-dark-400 mt-1">Manage your token holdings and wallet</p>
          </div>
        </div>
        <button 
          @click="showModal = false"
          class="text-dark-400 hover:text-white transition-colors p-2 hover:bg-dark-700 rounded-lg"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span class="ml-3 text-dark-400">Loading portfolio...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-red-400">{{ error }}</span>
          </div>
        </div>

        <!-- Portfolio Content -->
        <div v-else-if="portfolio">
          <!-- Enhanced Wallet Info -->
          <div class="bg-gradient-to-r from-dark-800/50 to-dark-700/50 rounded-xl p-6 mb-6 border border-dark-600/50">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-white">Platform Wallet Address</h3>
                <p class="text-dark-400 font-mono text-sm">{{ portfolio.walletAddress }}</p>
              </div>
              <div class="flex items-center space-x-2">
                <button 
                  @click="openDeposit"
                  class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm rounded-lg transition-all duration-300 hover:scale-105 font-semibold shadow-lg hover:shadow-green-500/25"
                >
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Deposit SOL</span>
                  </div>
                </button>
                <button 
                  @click="copyToClipboard(portfolio.walletAddress, 'Address')"
                  class="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <!-- Private Key Section -->
            <div class="border-t border-dark-700 pt-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-white">Private Key</h3>
                  <p class="text-dark-400 text-sm">Keep this secure and never share it</p>
                </div>
                <div class="flex items-center space-x-2">
                  <button 
                    @click="showPrivateKey = !showPrivateKey"
                    class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded-lg transition-colors"
                  >
                    {{ showPrivateKey ? 'Hide' : 'Show' }}
                  </button>
                  <button 
                    v-if="showPrivateKey"
                    @click="copyToClipboard(portfolio.privateKey, 'Private Key')"
                    class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div v-if="showPrivateKey" class="mt-3 p-3 bg-dark-700 rounded-lg">
                <p class="text-yellow-400 font-mono text-sm break-all">{{ portfolio.privateKey }}</p>
              </div>
            </div>
          </div>

          <!-- Portfolio Summary -->
          <div class="bg-gradient-to-r from-primary-500/10 to-solana-500/10 rounded-lg p-6 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-2xl font-bold text-white">Total Portfolio Value</h3>
                <p class="text-3xl font-bold text-primary-400 mt-2">{{ totalValueFormatted }}</p>
              </div>
              <div class="text-right">
                <p class="text-dark-400">Tokens</p>
                <p class="text-2xl font-bold text-white">{{ portfolio.tokens.length }}</p>
              </div>
            </div>
          </div>

          <!-- Tokens List -->
          <div v-if="hasTokens">
            <h3 class="text-xl font-semibold text-white mb-4">Your Tokens</h3>
            <div class="grid gap-4">
              <div 
                v-for="token in portfolio.tokens" 
                :key="token.mint"
                class="bg-gradient-to-r from-dark-800/50 to-dark-700/50 rounded-xl p-6 border border-dark-600/50 hover:border-primary-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/10"
              >
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-r from-primary-500/20 to-solana-500/20 rounded-xl flex items-center justify-center">
                      <span class="text-primary-400 font-bold text-lg">{{ token.symbol.charAt(0) }}</span>
                    </div>
                    <div>
                      <h4 class="text-white font-semibold text-lg">{{ token.name }}</h4>
                      <p class="text-dark-400 text-sm font-mono">{{ token.symbol }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-white font-bold text-lg">{{ token.balance.toFixed(6) }}</p>
                    <p v-if="token.value" class="text-primary-400 text-sm font-semibold">${{ token.value.toFixed(2) }}</p>
                    <p v-else class="text-dark-400 text-sm">Price N/A</p>
                  </div>
                </div>
                
                <!-- Token balance display only - no buy/sell buttons -->
                <div class="mb-4 p-3 bg-dark-800/50 rounded-lg border border-dark-700">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-white">{{ token.balance.toFixed(6) }}</div>
                    <div class="text-sm text-dark-400">{{ token.symbol }}</div>
                    <div v-if="token.value && token.value > 0" class="text-xs text-green-400 mt-1">
                      ≈ ${{ token.value.toFixed(2) }}
                    </div>
                  </div>
                </div>
                
                <!-- Enhanced Token Details -->
                <div class="pt-4 border-t border-dark-600/50">
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span class="text-dark-400 font-medium">Mint Address:</span>
                      <p class="text-white font-mono text-xs break-all bg-dark-700/50 px-2 py-1 rounded mt-1">{{ token.mint }}</p>
                    </div>
                    <div>
                      <span class="text-dark-400 font-medium">Decimals:</span>
                      <p class="text-white font-semibold">{{ token.decimals }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-dark-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <h3 class="text-xl font-semibold text-white mb-2">No Tokens Yet</h3>
            <p class="text-dark-400 mb-4">Buy CA beacons to start building your portfolio</p>
            <button 
              @click="showModal = false"
              class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              Start Trading
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Deposit Modal -->
  <div 
    v-if="showDeposit" 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    @click.self="closeDeposit"
  >
    <div class="bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl border border-dark-700/50 w-full max-w-md overflow-hidden shadow-2xl backdrop-blur-xl">
      <!-- Deposit Header -->
      <div class="flex items-center justify-between p-6 border-b border-dark-700/50 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div>
            <h3 class="text-xl font-bold text-white">Deposit SOL</h3>
            <p class="text-dark-400 text-sm">Add SOL to your platform wallet</p>
          </div>
        </div>
        <button 
          @click="closeDeposit"
          class="text-dark-400 hover:text-white transition-colors p-2 hover:bg-dark-700 rounded-lg"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Deposit Content -->
      <div class="p-6">
        <!-- Amount Input -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-white mb-2">Amount (SOL)</label>
          <div class="relative">
            <input
              v-model="depositAmount"
              type="number"
              step="0.001"
              min="0.001"
              placeholder="0.001"
              class="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all duration-300"
            />
            <div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400 text-sm font-medium">
              SOL
            </div>
          </div>
          <p class="text-xs text-dark-400 mt-1">Minimum deposit: 0.001 SOL</p>
        </div>

        <!-- Error Message -->
        <div v-if="depositError" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span class="text-red-400 text-sm">{{ depositError }}</span>
          </div>
        </div>

        <!-- Deposit Info -->
        <div class="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div class="flex items-start space-x-3">
            <svg class="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <div>
              <h4 class="text-blue-400 font-medium text-sm">Deposit Process</h4>
              <p class="text-blue-300/80 text-xs mt-1">
                You'll be prompted to sign a transaction to transfer SOL from your connected wallet to your platform wallet. This enables you to buy CA beacons and trade tokens.
              </p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-3">
          <button 
            @click="closeDeposit"
            class="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            @click="handleDeposit"
            :disabled="isDepositing || !depositAmount"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-green-500/25"
          >
            <div class="flex items-center justify-center space-x-2">
              <svg v-if="isDepositing" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>{{ isDepositing ? 'Depositing...' : 'Deposit SOL' }}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>