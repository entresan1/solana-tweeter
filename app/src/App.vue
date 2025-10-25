<script setup lang="ts">
  import { useRoute } from 'vue-router';
  import TheSidebar from './components/TheSidebar.vue';
  import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
  } from '@solana/wallet-adapter-wallets';
  import { initWallet } from 'solana-wallets-vue';
  import { initWorkspace } from '@src/hooks';
  import { onMounted } from 'vue';

  const route = useRoute();
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

  initWallet({ wallets, autoConnect: true });
  onMounted(() => {
    initWorkspace();
  });
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800">
    <!-- Background Pattern -->
    <div class="fixed inset-0 opacity-5">
      <div class="absolute inset-0" style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0); background-size: 20px 20px;"></div>
    </div>
    
    <div class="relative w-full max-w-6xl mx-auto">
      <!-- Sidebar -->
      <the-sidebar class="py-4 md:py-8 md:pl-4 md:pr-8 fixed w-20 md:w-64 z-10" />

      <!-- Main Content -->
      <main class="flex-1 ml-20 md:ml-64 min-h-screen">
        <!-- Header -->
        <header class="glass border-b border-dark-700/50 backdrop-blur-xl">
          <div class="flex items-center justify-between px-8 py-6">
            <div class="flex items-center space-x-4">
              <img src="/logo.png" alt="Solana Tweeter" class="h-8 w-8 rounded-lg" />
              <h1 class="text-2xl font-bold text-gradient" v-text="route.name"></h1>
            </div>
            <div class="flex items-center space-x-4">
              <div class="hidden md:flex items-center space-x-2 text-sm text-dark-400">
                <div class="w-2 h-2 bg-solana-500 rounded-full animate-pulse-slow"></div>
                <span>Solana Network</span>
              </div>
            </div>
          </div>
        </header>
        
        <!-- Router View -->
        <div class="animate-fade-in">
          <router-view></router-view>
        </div>
      </main>
    </div>
  </div>
</template>
