<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { platformWalletService } from '@src/lib/platform-wallet';

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
    
    // Fetch portfolio data from API
    const response = await fetch(`/api/platform-portfolio?walletAddress=${encodeURIComponent(userAddress)}`);
    const data = await response.json();
    
    if (data.success) {
      portfolio.value = data.portfolio;
    } else {
      throw new Error(data.error || 'Failed to load portfolio');
    }
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

// Sell token
const sellToken = async (token: Token) => {
  if (!wallet.value?.publicKey) return;
  
  try {
    const response = await fetch('/api/sell-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userWallet: wallet.value.publicKey.toBase58(),
        tokenMint: token.mint,
        amount: token.balance
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Refresh portfolio
      await loadPortfolio();
    } else {
      throw new Error(data.error || 'Failed to sell token');
    }
  } catch (err: any) {
    console.error('Sell token error:', err);
    error.value = err.message || 'Failed to sell token';
  }
};

// Buy token
const buyToken = async (tokenMint: string, amount: number) => {
  if (!wallet.value?.publicKey) return;
  
  try {
    const response = await fetch('/api/buy-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userWallet: wallet.value.publicKey.toBase58(),
        tokenMint,
        amount
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Refresh portfolio
      await loadPortfolio();
    } else {
      throw new Error(data.error || 'Failed to buy token');
    }
  } catch (err: any) {
    console.error('Buy token error:', err);
    error.value = err.message || 'Failed to buy token';
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
          <!-- Wallet Info -->
          <div class="bg-dark-800 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold text-white">Wallet Address</h3>
                <p class="text-dark-400 font-mono text-sm">{{ portfolio.walletAddress }}</p>
              </div>
              <button 
                @click="copyToClipboard(portfolio.walletAddress, 'Address')"
                class="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors"
              >
                Copy
              </button>
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
                
                <div class="flex space-x-3 mb-4">
                  <button 
                    @click="buyToken(token.mint, 1000)"
                    class="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 font-semibold shadow-lg hover:shadow-green-500/25"
                  >
                    <div class="flex items-center justify-center space-x-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Buy</span>
                    </div>
                  </button>
                  <button 
                    @click="sellToken(token)"
                    class="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 font-semibold shadow-lg hover:shadow-red-500/25"
                  >
                    <div class="flex items-center justify-center space-x-2">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                      </svg>
                      <span>Sell</span>
                    </div>
                  </button>
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
</template>