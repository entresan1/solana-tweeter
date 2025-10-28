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

// Buy/Sell functionality
const showBuyModal = ref(false);
const showSellModal = ref(false);
const selectedToken = ref<Token | null>(null);
const buyAmount = ref('');
const sellAmount = ref('');
const isTrading = ref(false);
const tradingError = ref('');

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

// Buy/Sell functions
const openBuyModal = (token: Token) => {
  selectedToken.value = token;
  buyAmount.value = '';
  tradingError.value = '';
  showBuyModal.value = true;
};

const openSellModal = (token: Token) => {
  selectedToken.value = token;
  sellAmount.value = '';
  tradingError.value = '';
  showSellModal.value = true;
};

const closeBuyModal = () => {
  showBuyModal.value = false;
  selectedToken.value = null;
  buyAmount.value = '';
  tradingError.value = '';
};

const closeSellModal = () => {
  showSellModal.value = false;
  selectedToken.value = null;
  sellAmount.value = '';
  tradingError.value = '';
};

const handleBuyToken = async () => {
  if (!selectedToken.value || !buyAmount.value) return;
  
  isTrading.value = true;
  tradingError.value = '';
  
  try {
    const amount = parseFloat(buyAmount.value);
    if (isNaN(amount) || amount <= 0) {
      tradingError.value = 'Please enter a valid amount';
      return;
    }
    
    // Use the real CA purchase system
    const { realCAPurchase } = await import('@src/lib/real-ca-purchase');
    
    const result = await realCAPurchase(
      selectedToken.value.mint,
      amount,
      wallet.value
    );
    
    if (result.success) {
      console.log('✅ Token bought successfully:', result);
      closeBuyModal();
      // Reload portfolio to show updated balance
      await loadPortfolio();
    } else {
      tradingError.value = result.error || 'Failed to buy token';
    }
  } catch (err: any) {
    console.error('Buy token error:', err);
    tradingError.value = err.message || 'Failed to buy token';
  } finally {
    isTrading.value = false;
  }
};

const handleSellToken = async () => {
  if (!selectedToken.value || !sellAmount.value) return;
  
  isTrading.value = true;
  tradingError.value = '';
  
  try {
    const amount = parseFloat(sellAmount.value);
    if (isNaN(amount) || amount <= 0) {
      tradingError.value = 'Please enter a valid amount';
      return;
    }
    
    if (amount > selectedToken.value.balance) {
      tradingError.value = 'Insufficient token balance';
      return;
    }
    
    // For now, we'll just show a message that selling is not implemented
    // In a real implementation, you'd integrate with a DEX to sell tokens
    tradingError.value = 'Selling tokens is not yet implemented. You can withdraw your tokens using the private key.';
  } catch (err: any) {
    console.error('Sell token error:', err);
    tradingError.value = err.message || 'Failed to sell token';
  } finally {
    isTrading.value = false;
  }
};

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
    <div class="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-dark-700">
        <h2 class="text-lg font-semibold text-white">Portfolio</h2>
        <button 
          @click="showModal = false"
          class="text-dark-400 hover:text-white transition-colors p-1"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          <span class="ml-2 text-dark-400 text-sm">Loading...</span>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
          <span class="text-red-400 text-sm">{{ error }}</span>
        </div>

        <!-- Portfolio Content -->
        <div v-else-if="portfolio">
          <!-- Wallet Info -->
          <div class="bg-dark-800 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-xs text-dark-400">Platform Wallet</p>
                <p class="text-sm font-mono text-white">{{ portfolio.walletAddress.slice(0, 8) }}...{{ portfolio.walletAddress.slice(-6) }}</p>
              </div>
              <div class="flex space-x-2">
                <button 
                  @click="openDeposit"
                  class="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                >
                  + SOL
                </button>
                <button 
                  @click="copyToClipboard(portfolio.walletAddress, 'Address')"
                  class="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-xs rounded transition-colors"
                >
                  Copy
                </button>
                <button 
                  @click="copyToClipboard(portfolio.privateKey, 'Private Key')"
                  class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded transition-colors"
                >
                  Withdraw
                </button>
              </div>
            </div>
            
            <!-- Private Key -->
            <div class="border-t border-dark-700 pt-3">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs text-dark-400">Private Key</p>
                  <p class="text-xs text-yellow-400 font-mono">{{ showPrivateKey ? portfolio.privateKey.slice(0, 16) + '...' : '••••••••••••••••' }}</p>
                </div>
                <div class="flex space-x-1">
                  <button 
                    @click="showPrivateKey = !showPrivateKey"
                    class="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded transition-colors"
                  >
                    {{ showPrivateKey ? 'Hide' : 'Show' }}
                  </button>
                  <button 
                    v-if="showPrivateKey"
                    @click="copyToClipboard(portfolio.privateKey, 'Private Key')"
                    class="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Portfolio Summary -->
          <div class="bg-primary-500/10 rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-dark-400">Total Value</p>
                <p class="text-2xl font-bold text-primary-400">{{ totalValueFormatted }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-dark-400">Tokens</p>
                <p class="text-xl font-bold text-white">{{ portfolio.tokens.length }}</p>
              </div>
            </div>
          </div>

          <!-- Tokens List -->
          <div v-if="hasTokens">
            <div class="space-y-3">
              <div 
                v-for="token in portfolio.tokens" 
                :key="token.mint"
                class="bg-dark-800 rounded-lg p-3 border border-dark-700"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center">
                      <span class="text-primary-400 font-bold text-sm">{{ token.symbol.charAt(0) }}</span>
                    </div>
                    <div>
                      <p class="text-white font-medium text-sm">{{ token.symbol }}</p>
                      <p class="text-dark-400 text-xs">{{ token.name }}</p>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <div class="text-right">
                      <p class="text-white font-semibold text-sm">{{ token.balance.toFixed(4) }}</p>
                      <p v-if="token.value" class="text-primary-400 text-xs">${{ token.value.toFixed(2) }}</p>
                      <p v-else class="text-dark-400 text-xs">N/A</p>
                    </div>
                    <div class="flex space-x-1">
                      <button 
                        @click="openBuyModal(token)"
                        class="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded transition-colors"
                        title="Buy more tokens"
                      >
                        Buy
                      </button>
                      <button 
                        @click="openSellModal(token)"
                        class="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                        title="Sell tokens"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-8">
            <div class="w-12 h-12 mx-auto text-dark-600 mb-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">No Tokens</h3>
            <p class="text-dark-400 text-sm mb-4">Buy CA beacons to start building your portfolio</p>
            <button 
              @click="showModal = false"
              class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded transition-colors"
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
    <div class="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-sm overflow-hidden shadow-xl">
      <!-- Deposit Header -->
      <div class="flex items-center justify-between p-4 border-b border-dark-700">
        <h3 class="text-lg font-semibold text-white">Deposit SOL</h3>
        <button 
          @click="closeDeposit"
          class="text-dark-400 hover:text-white transition-colors p-1"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Deposit Content -->
      <div class="p-4">
        <!-- Amount Input -->
        <div class="mb-4">
          <label class="block text-sm text-white mb-2">Amount (SOL)</label>
          <input
            v-model="depositAmount"
            type="number"
            step="0.001"
            min="0.001"
            placeholder="0.001"
            class="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded text-white placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
          <p class="text-xs text-dark-400 mt-1">Min: 0.001 SOL</p>
        </div>

        <!-- Error Message -->
        <div v-if="depositError" class="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded">
          <span class="text-red-400 text-sm">{{ depositError }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-2">
          <button 
            @click="closeDeposit"
            class="flex-1 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="handleDeposit"
            :disabled="isDepositing || !depositAmount"
            class="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isDepositing ? 'Depositing...' : 'Deposit' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Buy Token Modal -->
  <div 
    v-if="showBuyModal" 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    @click.self="closeBuyModal"
  >
    <div class="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-sm overflow-hidden shadow-xl">
      <!-- Buy Header -->
      <div class="flex items-center justify-between p-4 border-b border-dark-700">
        <h3 class="text-lg font-semibold text-white">Buy {{ selectedToken?.symbol }}</h3>
        <button 
          @click="closeBuyModal"
          class="text-dark-400 hover:text-white transition-colors p-1"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Buy Content -->
      <div class="p-4">
        <!-- Amount Input -->
        <div class="mb-4">
          <label class="block text-sm text-white mb-2">Amount (SOL)</label>
          <input
            v-model="buyAmount"
            type="number"
            step="0.001"
            min="0.001"
            placeholder="0.1"
            class="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded text-white placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
          <p class="text-xs text-dark-400 mt-1">Min: 0.001 SOL</p>
        </div>

        <!-- Error Message -->
        <div v-if="tradingError" class="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded">
          <span class="text-red-400 text-sm">{{ tradingError }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-2">
          <button 
            @click="closeBuyModal"
            class="flex-1 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="handleBuyToken"
            :disabled="isTrading || !buyAmount"
            class="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isTrading ? 'Buying...' : 'Buy' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Sell Token Modal -->
  <div 
    v-if="showSellModal" 
    class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
    @click.self="closeSellModal"
  >
    <div class="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-sm overflow-hidden shadow-xl">
      <!-- Sell Header -->
      <div class="flex items-center justify-between p-4 border-b border-dark-700">
        <h3 class="text-lg font-semibold text-white">Sell {{ selectedToken?.symbol }}</h3>
        <button 
          @click="closeSellModal"
          class="text-dark-400 hover:text-white transition-colors p-1"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Sell Content -->
      <div class="p-4">
        <!-- Amount Input -->
        <div class="mb-4">
          <label class="block text-sm text-white mb-2">Amount ({{ selectedToken?.symbol }})</label>
          <input
            v-model="sellAmount"
            type="number"
            step="0.0001"
            min="0.0001"
            :max="selectedToken?.balance"
            placeholder="0.1"
            class="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded text-white placeholder-dark-400 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
          />
          <p class="text-xs text-dark-400 mt-1">Max: {{ selectedToken?.balance.toFixed(4) }} {{ selectedToken?.symbol }}</p>
        </div>

        <!-- Error Message -->
        <div v-if="tradingError" class="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded">
          <span class="text-red-400 text-sm">{{ tradingError }}</span>
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-2">
          <button 
            @click="closeSellModal"
            class="flex-1 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm rounded transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="handleSellToken"
            :disabled="isTrading || !sellAmount"
            class="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isTrading ? 'Selling...' : 'Sell' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>