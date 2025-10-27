<script setup lang="ts">
  import { useRoute } from 'vue-router';
  import TheSidebar from './components/TheSidebar.vue';
  import DatabaseDebug from './components/DatabaseDebug.vue';
  import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
  } from '@solana/wallet-adapter-wallets';
  import { initWallet, useWallet } from 'solana-wallets-vue';
  import { initWorkspace, useProfileAutoCreate } from '@src/hooks';
  import { onMounted, watch } from 'vue';
  import { setCurrentUserAddress, connectWebSocket, isWSInitialized } from '@src/lib/websocket-service';

  const route = useRoute();
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

  initWallet({ wallets, autoConnect: true });
  const { wallet } = useWallet();
  
  // Initialize profile auto-creation
  useProfileAutoCreate();
  
  onMounted(() => {
    initWorkspace();
    
    // Ensure WebSocket is connected
    if (!isWSInitialized()) {
      console.log('🔌 Manually connecting WebSocket...');
      connectWebSocket();
    }
    
    // Set current user address for WebSocket
    const currentUserAddress = wallet.value?.publicKey?.toString();
    setCurrentUserAddress(currentUserAddress || null);
  });

  // Watch for wallet changes and update WebSocket
  watch(wallet, (newWallet) => {
    const currentUserAddress = newWallet?.publicKey?.toString();
    setCurrentUserAddress(currentUserAddress || null);
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
      <the-sidebar class="py-4 md:py-8 md:pl-4 md:pr-8 fixed w-20 md:w-64 z-10" />

      <!-- Main Content -->
      <main class="flex-1 ml-20 md:ml-64 min-h-screen">
        <!-- Clean Header -->
        <header class="glass border-b border-dark-700/50 backdrop-blur-xl">
          <div class="flex items-center justify-between px-8 py-6">
            <div class="flex items-center space-x-4">
              <img src="/logo.png" alt="Trench Beacon" class="h-8 w-8 rounded-lg" />
              <h1 class="text-2xl font-bold text-gradient" v-text="route.name"></h1>
            </div>
            <div class="flex items-center space-x-4">
              <div class="hidden md:flex items-center space-x-2 text-sm text-dark-400">
                <div class="w-2 h-2 bg-solana-500 rounded-full"></div>
                <span>Solana Network</span>
              </div>
              <!-- Status Indicator -->
              <div class="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-dark-800/50 border border-dark-600/50">
                <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                <span class="text-xs text-dark-300">Live</span>
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
  </div>
</template>
