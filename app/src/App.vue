<script setup lang="ts">
  import { useRoute } from 'vue-router';
  import { ref } from 'vue';
  import TheSidebar from './components/TheSidebar.vue';
  import DatabaseDebug from './components/DatabaseDebug.vue';
  import { notificationService } from '@src/lib/notification-service';
  import { profileState } from '@src/lib/profile-state';
  import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
  } from '@solana/wallet-adapter-wallets';
  import { initWallet, useWallet } from 'solana-wallets-vue';
  import { initWorkspace, useProfileAutoCreate } from '@src/hooks';
  import { onMounted, watch } from 'vue';
  import { initializeTweetsService } from '@src/lib/http-tweets-service';

  const route = useRoute();
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

  initWallet({ wallets, autoConnect: true });
  const { wallet } = useWallet();
  
  // How modal state
  const showHowModal = ref(false);
  
  // Initialize profile auto-creation
  useProfileAutoCreate();
  
  onMounted(() => {
    initWorkspace();
    
    // Delay tweets service initialization to let router settle
    setTimeout(() => {
      console.log('🚀 Starting HTTP tweets service...');
      initializeTweetsService();
    }, 200); // 200ms delay
  });

  // Watch for wallet changes
  watch(wallet, async (newWallet) => {
    console.log('👤 Wallet changed:', newWallet?.publicKey?.toString());
    
    // Load profile data when wallet connects
    if (newWallet?.publicKey) {
      await profileState.loadCurrentUserProfile(newWallet);
    } else {
      profileState.clearProfile();
    }
  });
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 relative overflow-hidden">
    <!-- Very Subtle Background Pattern -->
    <div class="fixed inset-0 opacity-5">
      <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, rgba(14, 165, 233, 0.15) 1px, transparent 0); background-size: 30px 30px;"></div>
    </div>
    
    <!-- Enhanced Floating Elements -->
    <div class="fixed inset-0 pointer-events-none">
      <!-- Primary floating dots -->
      <div class="absolute top-20 left-10 w-2 h-2 bg-primary-400 rounded-full animate-float opacity-60"></div>
      <div class="absolute top-40 right-20 w-1 h-1 bg-solana-400 rounded-full animate-float opacity-40" style="animation-delay: 2s;"></div>
      <div class="absolute bottom-40 left-20 w-1.5 h-1.5 bg-primary-300 rounded-full animate-float opacity-50" style="animation-delay: 4s;"></div>
      
      <!-- Additional floating elements -->
      <div class="absolute top-60 left-1/4 w-1 h-1 bg-primary-500 rounded-full animate-float opacity-30" style="animation-delay: 1s;"></div>
      <div class="absolute top-80 right-1/3 w-1.5 h-1.5 bg-solana-300 rounded-full animate-float opacity-40" style="animation-delay: 3s;"></div>
      <div class="absolute bottom-60 right-10 w-1 h-1 bg-primary-400 rounded-full animate-float opacity-35" style="animation-delay: 5s;"></div>
      <div class="absolute top-1/3 left-1/3 w-1 h-1 bg-solana-500 rounded-full animate-float opacity-25" style="animation-delay: 2.5s;"></div>
      <div class="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-primary-200 rounded-full animate-float opacity-30" style="animation-delay: 4.5s;"></div>
      
      <!-- Subtle geometric shapes -->
      <div class="absolute top-32 right-1/2 w-3 h-3 border border-primary-400/20 rotate-45 animate-float opacity-20" style="animation-delay: 1.5s;"></div>
      <div class="absolute bottom-32 left-1/2 w-2 h-2 border border-solana-400/20 rotate-12 animate-float opacity-15" style="animation-delay: 3.5s;"></div>
      <div class="absolute top-1/2 left-1/4 w-2 h-2 border border-primary-300/25 rotate-45 animate-float opacity-20" style="animation-delay: 2.8s;"></div>
    </div>
    
    <div class="relative w-full max-w-6xl mx-auto">
      <!-- Sidebar -->
      <the-sidebar />

      <!-- Main Content -->
      <main class="flex-1 ml-16 sm:ml-20 md:ml-64 min-h-screen">
        <!-- Enhanced Header -->
        <header class="glass border-b border-dark-700/50 backdrop-blur-xl">
          <div class="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div class="flex items-center space-x-3 sm:space-x-4">
              <div class="relative">
                <img src="/logo.png" alt="Trench Beacon" class="h-6 w-6 sm:h-8 sm:w-8 rounded-lg" />
                <!-- Notification indicator -->
                <div 
                  v-if="notificationService.hasNewBeacons.value"
                  class="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full border-2 border-dark-900 animate-pulse"
                  title="New beacons available - refresh to see them"
                ></div>
              </div>
              <h1 class="text-lg sm:text-xl lg:text-2xl font-bold text-gradient" v-text="route.name"></h1>
              <!-- How Button -->
              <button 
                @click="showHowModal = true"
                class="ml-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-dark-300 hover:text-primary-400 bg-dark-800/50 hover:bg-dark-700/50 border border-dark-600 hover:border-primary-500/50 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/10"
                title="How to use Trench Beacon"
              >
                How
              </button>
            </div>
            <div class="flex items-center space-x-2 sm:space-x-4">
              <div class="hidden sm:flex items-center space-x-2 text-sm text-dark-400">
                <div class="w-2 h-2 bg-solana-500 rounded-full animate-pulse"></div>
                <span>Solana Network</span>
              </div>
              <!-- Status Indicator -->
              <div class="flex items-center space-x-2 px-2 sm:px-3 py-1 rounded-full bg-dark-800/50 border border-dark-600/50">
                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span class="text-xs text-dark-300 hidden sm:inline">Live</span>
              </div>
            </div>
          </div>
        </header>
        
        <!-- Router View -->
        <div>
          <router-view></router-view>
        </div>
        
        <!-- Database Debug Component -->
        <DatabaseDebug />
      </main>
    </div>
    
    <!-- How Modal -->
    <div 
      v-if="showHowModal" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showHowModal = false"
    >
      <div 
        class="bg-dark-900 border border-dark-700 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gradient">How to Use Trench Beacon</h2>
          <button 
            @click="showHowModal = false"
            class="text-dark-400 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-6 text-dark-300">
          <div>
            <h3 class="text-lg font-semibold text-white mb-3">🚀 Creating Beacons</h3>
            <ul class="space-y-2 text-sm">
              <li>• Write your message in the main input field</li>
              <li>• Add a topic with # (optional)</li>
              <li>• Click "Beacon" to post to Solana blockchain</li>
              <li>• Each beacon costs 0.001 SOL</li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold text-white mb-3">💰 Smart Payment</h3>
            <ul class="space-y-2 text-sm">
              <li>• Platform wallet pays when available</li>
              <li>• Falls back to your wallet if needed</li>
              <li>• No extra fees for smart payments</li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold text-white mb-3">🪙 Buying CA Tokens</h3>
            <ul class="space-y-2 text-sm">
              <li>• Click "Buy CA" on any beacon</li>
              <li>• Enter contract address (44 characters)</li>
              <li>• Choose SOL amount to swap</li>
              <li>• Get real CA tokens in your wallet!</li>
            </ul>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold text-white mb-3">💬 Replying</h3>
            <ul class="space-y-2 text-sm">
              <li>• Click "Reply" on any beacon</li>
              <li>• Write your response</li>
              <li>• Replies appear automatically</li>
              <li>• Click "Hide/Show" to toggle replies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
