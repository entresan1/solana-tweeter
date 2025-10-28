<script setup lang="ts">
  import { useWallet, WalletMultiButton } from 'solana-wallets-vue';
  import { useRoute } from 'vue-router';
  import { ref, onMounted, watch } from 'vue';
  import { platformWalletService } from '@src/lib/platform-wallet';
  import SafeRouterLink from './SafeRouterLink.vue';
  import PlatformWalletModal from './PlatformWalletModal.vue';
  
  const { connected, wallet } = useWallet();
  const route = useRoute();
  
  const platformWalletAddress = ref('');
  const platformBalance = ref(0);
  const isPlatformWalletDropdownOpen = ref(false);
  const platformWalletModal = ref();
  
  // Load platform wallet data when wallet connects
  const loadPlatformWalletData = async () => {
    if (wallet.value?.publicKey) {
      try {
        const userAddress = wallet.value.publicKey.toBase58();
        platformWalletAddress.value = platformWalletService.getPlatformWalletAddress(userAddress);
        platformBalance.value = await platformWalletService.getBalance(userAddress);
      } catch (error) {
        console.warn('Failed to load platform wallet data:', error);
        platformBalance.value = 0;
      }
    }
  };
  
  // Watch for wallet connection changes
  watch(connected, (isConnected) => {
    if (isConnected) {
      loadPlatformWalletData();
    } else {
      platformWalletAddress.value = '';
      platformBalance.value = 0;
    }
  });
  
  // Load data on mount if already connected
  onMounted(() => {
    if (connected) {
      loadPlatformWalletData();
    }
  });
  
  const copyPlatformWalletAddress = async () => {
    try {
      await navigator.clipboard.writeText(platformWalletAddress.value);
      // You could add a toast notification here
      console.log('Platform wallet address copied to clipboard');
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };
  
  // Open portfolio management modal
  const openPortfolio = () => {
    platformWalletModal.value?.open();
  };

  // Toggle platform wallet dropdown
  const togglePlatformWalletDropdown = () => {
    isPlatformWalletDropdownOpen.value = !isPlatformWalletDropdownOpen.value;
  };

  // Close platform wallet dropdown
  const closePlatformWalletDropdown = () => {
    isPlatformWalletDropdownOpen.value = false;
  };

  // Help modal state
  const showHelpModal = ref(false);

  // Toggle help modal
  const toggleHelpModal = () => {
    showHelpModal.value = !showHelpModal.value;
  };

</script>

<template>
  <aside class="fixed left-0 top-0 h-screen w-20 md:w-64 z-10 flex flex-col items-center md:items-stretch space-y-2 md:space-y-4 py-4 md:py-8 md:pl-4 md:pr-8 bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50">
    <!-- Logo -->
    <div class="mb-8">
      <SafeRouterLink
        :to="{ name: 'Home' }"
        class="inline-block rounded-2xl hover:bg-dark-800/50 p-4 md:self-start transition-all duration-200 hover-lift group"
      >
        <div class="flex items-center space-x-3">
            <img src="/logo.png" alt="Trench Beacon" class="h-8 w-8 rounded-lg" />
            <span class="hidden md:block text-xl font-bold text-gradient">Trench Beacon</span>
        </div>
      </SafeRouterLink>
    </div>
    <!-- Navigation -->
    <div class="flex flex-col items-center md:items-stretch space-y-2 w-full">
      <SafeRouterLink
        :to="{ name: 'Home' }"
        class="rounded-2xl hover:bg-dark-800/50 p-4 md:w-full inline-flex items-center space-x-4 transition-all duration-300 group"
        :class="route.name === 'Home' ? 'bg-gradient-to-r from-primary-500/20 to-solana-500/20 border border-primary-500/30' : ''"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-xl"
             :class="route.name === 'Home' ? 'bg-gradient-to-r from-primary-500 to-solana-500' : 'bg-dark-700 group-hover:bg-dark-600'">
          <svg
            v-if="route.name === 'Home'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-dark-300 group-hover:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
        <div class="text-lg font-medium hidden md:block"
             :class="route.name === 'Home' ? 'text-primary-300' : 'text-dark-400 group-hover:text-primary-300'">Home</div>
      </SafeRouterLink>

      
      <!-- Profile Link (only when connected) -->
      <SafeRouterLink
        v-if="connected"
        :to="{ name: 'Profile' }"
        class="rounded-2xl hover:bg-dark-800/50 p-4 md:w-full inline-flex items-center space-x-4 transition-all duration-300 group"
        :class="route.name === 'Profile' ? 'bg-gradient-to-r from-primary-500/20 to-solana-500/20 border border-accent-500/30' : ''"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-xl"
             :class="route.name === 'Profile' ? 'bg-gradient-to-r from-primary-500 to-solana-500' : 'bg-dark-700 group-hover:bg-dark-600'">
          <svg
            v-if="route.name === 'Profile'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clip-rule="evenodd"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-dark-300 group-hover:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div class="text-lg font-medium hidden md:block"
             :class="route.name === 'Profile' ? 'text-primary-300' : 'text-dark-400 group-hover:text-primary-300'">Profile</div>
      </SafeRouterLink>
      
      <!-- X402 Proof Link -->
      <SafeRouterLink
        :to="{ name: 'X402' }"
        class="rounded-2xl hover:bg-dark-800/50 p-4 md:w-full inline-flex items-center space-x-4 transition-all duration-300 group"
        :class="route.name === 'X402' ? 'bg-gradient-to-r from-primary-500/20 to-solana-500/20 border border-primary-500/30' : ''"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-xl"
             :class="route.name === 'X402' ? 'bg-gradient-to-r from-primary-500 to-solana-500' : 'bg-dark-700 group-hover:bg-dark-600'">
          <svg
            v-if="route.name === 'X402'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-dark-300 group-hover:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="text-lg font-medium hidden md:block"
             :class="route.name === 'X402' ? 'text-primary-300' : 'text-dark-400 group-hover:text-primary-300'">x402</div>
      </SafeRouterLink>

      <!-- Leaderboard Link -->
      <SafeRouterLink
        :to="{ name: 'Leaderboard' }"
        class="rounded-2xl hover:bg-dark-800/50 p-4 md:w-full inline-flex items-center space-x-4 transition-all duration-300 group"
        :class="route.name === 'Leaderboard' ? 'bg-gradient-to-r from-primary-500/20 to-solana-500/20 border border-primary-500/30' : ''"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-xl"
             :class="route.name === 'Leaderboard' ? 'bg-gradient-to-r from-primary-500 to-solana-500' : 'bg-dark-700 group-hover:bg-dark-600'">
          <svg
            v-if="route.name === 'Leaderboard'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-dark-300 group-hover:text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-lg font-medium hidden md:block"
             :class="route.name === 'Leaderboard' ? 'text-primary-300' : 'text-dark-400 group-hover:text-primary-300'">Leaderboard</div>
      </SafeRouterLink>

      <!-- How Button -->
      <button
        @click="toggleHelpModal"
        class="rounded-2xl hover:bg-dark-800/50 p-4 md:w-full inline-flex items-center space-x-4 transition-all duration-300 group"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400 group-hover:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="text-lg font-medium hidden md:block text-dark-400 group-hover:text-blue-300">How</div>
      </button>
      
      
      <!-- Platform Wallet Dropdown (only when connected) -->
      <div v-if="connected" class="mt-4">
        <!-- Dropdown Trigger -->
        <button
          @click="togglePlatformWalletDropdown"
          class="w-full p-4 bg-dark-800/30 border border-dark-700 rounded-2xl hover:bg-dark-800/50 transition-all duration-300 flex items-center justify-between group"
        >
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <span class="text-sm font-medium text-white hidden md:block">Platform Wallet</span>
          </div>
          <svg 
            class="w-4 h-4 text-dark-400 group-hover:text-white transition-all duration-300 hidden md:block"
            :class="{ 'rotate-180': isPlatformWalletDropdownOpen }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown Content -->
        <div 
          v-if="isPlatformWalletDropdownOpen"
          class="mt-2 p-4 bg-dark-800/30 border border-dark-700 rounded-2xl space-y-3 hidden md:block"
        >
          <div class="text-xs text-dark-400">
            <div class="flex items-center justify-between mb-1">
              <span>Address:</span>
              <span class="text-yellow-400 font-mono text-xs break-all">{{ platformWalletAddress.slice(0, 6) }}...{{ platformWalletAddress.slice(-4) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Balance:</span>
              <span class="text-yellow-400 font-semibold">{{ platformBalance.toFixed(4) }} SOL</span>
            </div>
          </div>
          <div class="flex flex-col space-y-2">
            <button
              @click="copyPlatformWalletAddress"
              class="w-full text-xs btn-secondary py-2 px-3 rounded-lg"
            >
              Copy Address
            </button>
            <button
              @click="openPortfolio"
              class="w-full text-xs btn-primary py-2 px-3 rounded-lg"
            >
              Manage
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Wallet Connection -->
    <div class="mt-auto pt-6 w-full">
      <div class="glass rounded-2xl p-4 hover-glow">
        <div class="md:block hidden">
          <wallet-multi-button></wallet-multi-button>
        </div>
        <!-- Mobile: Just show wallet icon -->
        <div class="md:hidden flex justify-center">
          <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    
  </aside>

  <!-- Help Modal -->
  <div v-if="showHelpModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-2xl p-6 max-w-md w-full border border-dark-700">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-bold text-white">How Trench Beacon Works</h3>
        <button @click="toggleHelpModal" class="text-dark-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div class="space-y-4 text-dark-300">
        <div>
          <h4 class="font-semibold text-white mb-2">🔗 Platform Wallet</h4>
          <p class="text-sm">A shared wallet for platform operations. Deposit SOL to use for beacons, tips, and token trading without individual wallet transactions.</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">📡 Beacons</h4>
          <p class="text-sm">Post messages, share thoughts, or announcements. Each beacon costs a small fee from the platform wallet. Click on usernames to see their beacons!</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">🏷️ Topics</h4>
          <p class="text-sm">Click on any topic tag to filter beacons by that topic. Discover content by category!</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">🪙 CA Tokens</h4>
          <p class="text-sm">When a beacon contains a 44-character contract address, you can buy those tokens directly! CA addresses don't count toward character limits.</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">💼 Portfolio Management</h4>
          <p class="text-sm">Click "Manage" in the sidebar to access your platform wallet portfolio. Buy, sell, and manage tokens you've purchased!</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">💰 Tips & Fees</h4>
          <p class="text-sm">Tip beacons you like! 5% of tips go to treasury. All beacon fees and tip fees fund strategic buybacks, creating a flywheel effect.</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">🏆 Leaderboard</h4>
          <p class="text-sm">Check the leaderboard to see top users by beacons posted, likes received, and tips earned!</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">⚡ x402 Protocol</h4>
          <p class="text-sm"><strong>Both browser wallet and platform wallet use x402!</strong> This ensures secure, verifiable payments for all transactions on the platform.</p>
        </div>
        
        <div>
          <h4 class="font-semibold text-white mb-2">🔄 Flywheel Effect</h4>
          <p class="text-sm">More activity → More fees → More buybacks → Higher value → More activity. A self-reinforcing cycle!</p>
        </div>
      </div>
      
      <div class="mt-6 flex justify-end">
        <button @click="toggleHelpModal" class="btn-primary px-4 py-2 rounded-lg text-sm">
          Got it!
        </button>
      </div>
    </div>
  </div>
  
  <!-- Platform Wallet Portfolio Modal -->
  <PlatformWalletModal ref="platformWalletModal" />
</template>