<script setup lang="ts">
  import { useWallet, WalletMultiButton } from 'solana-wallets-vue';
  import { useRoute } from 'vue-router';
  import { ref, onMounted, watch } from 'vue';
  import { platformWalletService } from '@src/lib/platform-wallet';
  import NotificationIcon from './NotificationIcon.vue';
  
  const { connected, wallet } = useWallet();
  const route = useRoute();
  
  const platformWalletAddress = ref('');
  const platformBalance = ref(0);
  
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
  
  const showPrivateKey = async () => {
    if (!wallet.value?.publicKey) return;
    
    try {
      const userAddress = wallet.value.publicKey.toBase58();
      const privateKey = platformWalletService.getPlatformWalletPrivateKey(userAddress);
      
      // Show private key in a secure way (you might want to add a confirmation dialog)
      const confirmed = confirm('⚠️ WARNING: This will reveal your platform wallet private key. Only do this if you want to withdraw funds. Continue?');
      
      if (confirmed) {
        await navigator.clipboard.writeText(privateKey);
        alert('Private key copied to clipboard. Keep it secure!');
      }
    } catch (error) {
      console.error('Failed to get private key:', error);
      alert('Failed to get private key');
    }
  };

  const handleNotificationClick = () => {
    // Reset notification count and refresh the page
    import('@src/lib/notification-service').then(({ notificationService }) => {
      notificationService.resetNotificationCount();
      window.location.reload();
    });
  };
</script>

<template>
  <aside class="flex flex-col items-center md:items-stretch space-y-2 md:space-y-4 h-full">
    <!-- Logo -->
    <div class="mb-8">
      <router-link
        :to="{ name: 'Home' }"
        class="inline-block rounded-2xl hover:bg-dark-800/50 p-4 md:self-start transition-all duration-200 hover-lift group"
      >
        <div class="flex items-center space-x-3">
            <img src="/logo.png" alt="Trench Beacon" class="h-8 w-8 rounded-lg" />
            <span class="hidden md:block text-xl font-bold text-gradient">Trench Beacon</span>
        </div>
      </router-link>
    </div>
    <!-- Navigation -->
    <div class="flex flex-col items-center md:items-stretch space-y-2 w-full">
      <router-link
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
      </router-link>
      
      <router-link
        :to="{ name: 'Topics' }"
        class="rounded-2xl hover:bg-dark-800/50 p-4 md:w-full inline-flex items-center space-x-4 transition-all duration-300 group"
        :class="route.name === 'Topics' ? 'bg-gradient-to-r from-primary-500/20 to-solana-500/20 border border-primary-500/30' : ''"
      >
        <div class="flex items-center justify-center w-8 h-8 rounded-xl"
             :class="route.name === 'Topics' ? 'bg-gradient-to-r from-primary-500 to-solana-500' : 'bg-dark-700 group-hover:bg-dark-600'">
          <svg
            v-if="route.name === 'Topics'"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-white"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"
            />
            <path
              d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"
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
              d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
            />
          </svg>
        </div>
        <div class="text-lg font-medium hidden md:block"
             :class="route.name === 'Topics' ? 'text-primary-300' : 'text-dark-400 group-hover:text-primary-300'">Topics</div>
      </router-link>
      
      <!-- Profile Link (only when connected) -->
      <router-link
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
      </router-link>
      
      <!-- X402 Proof Link -->
      <router-link
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
      </router-link>
      
      <!-- Notification Icon -->
      <div class="rounded-2xl hover:bg-dark-800/50 p-4 md:w-full flex items-center justify-center md:justify-start transition-all duration-300 group cursor-pointer" @click="handleNotificationClick">
        <NotificationIcon />
        <div class="text-lg font-medium hidden md:block text-dark-400 group-hover:text-primary-300 ml-4">
          Notifications
        </div>
      </div>
      
      <!-- Platform Wallet Section (only when connected) -->
      <div v-if="connected" class="mt-4 p-4 bg-dark-800/30 border border-dark-700 rounded-2xl">
        <div class="flex items-center space-x-2 mb-3">
          <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          <span class="text-sm font-medium text-white">Platform Wallet</span>
        </div>
        <div class="space-y-2">
          <div class="text-xs text-dark-400">
            <div class="flex items-center justify-between mb-1">
              <span>Address:</span>
              <span class="text-yellow-400 font-mono">{{ platformWalletAddress.slice(0, 6) }}...{{ platformWalletAddress.slice(-4) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Balance:</span>
              <span class="text-yellow-400 font-semibold">{{ platformBalance.toFixed(4) }} SOL</span>
            </div>
          </div>
          <button
            @click="copyPlatformWalletAddress"
            class="w-full text-xs btn-secondary py-1 px-2"
          >
            Copy Address
          </button>
          <button
            @click="showPrivateKey"
            class="w-full text-xs btn-primary py-1 px-2"
          >
            Show Private Key
          </button>
        </div>
      </div>
    </div>
    
    <!-- Wallet Connection -->
    <div class="mt-auto pt-6 w-full">
      <div class="glass rounded-2xl p-4 hover-glow">
        <wallet-multi-button></wallet-multi-button>
      </div>
    </div>
    
  </aside>
</template>