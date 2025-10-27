<script setup lang="ts">
  import { onBeforeMount, ref, onMounted, watch } from 'vue';
  import TweetForm from '@src/components/TweetForm.vue';
  import TweetList from '@src/components/TweetList.vue';
  import { fetchTweets } from '@src/api';
  import { TweetModel } from '@src/models/tweet.model';
  import { useWallet } from 'solana-wallets-vue';
  import { platformWalletService } from '@src/lib/platform-wallet';

  const tweets = ref<TweetModel[]>([]);
  const loading = ref(true);
  
  const { connected, wallet } = useWallet();
  const platformWalletAddress = ref('');
  const platformBalance = ref(0);
  const showPlatformWalletInfo = ref(false);

  onBeforeMount(() => {
    console.log('PageHome: Fetching tweets...');
    fetchTweets()
      .then((fetchedTweets) => {
        console.log('PageHome: Fetched tweets:', fetchedTweets);
        console.log('PageHome: Number of tweets:', fetchedTweets.length);
        tweets.value = fetchedTweets;
      })
      .finally(() => (loading.value = false));
  });

  const addTweet = (tweet: TweetModel) => {
    console.log('📝 Adding new tweet to list:', tweet);
    tweets.value.unshift(tweet); // Add to beginning of list
    console.log('📝 Updated tweets list length:', tweets.value.length);
  };

  // Load platform wallet data
  const loadPlatformWalletData = async () => {
    if (wallet.value?.publicKey) {
      try {
        const userAddress = wallet.value.publicKey.toBase58();
        platformWalletAddress.value = platformWalletService.getPlatformWalletAddress(userAddress);
        platformBalance.value = await platformWalletService.getBalance(userAddress);
        showPlatformWalletInfo.value = true;
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
      showPlatformWalletInfo.value = false;
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
</script>

<template>
  <tweet-form @added="addTweet"></tweet-form>
  
  <!-- Platform Wallet Info Section -->
  <div v-if="showPlatformWalletInfo" class="card mb-6">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center space-x-3">
        <svg class="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
        <h2 class="text-xl font-semibold text-white">Your Platform Wallet</h2>
      </div>
      <div class="text-sm text-yellow-400 font-semibold">
        {{ platformBalance.toFixed(6) }} SOL
      </div>
    </div>
    
    <div class="space-y-3">
      <div class="p-3 bg-dark-800/50 border border-dark-700 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-dark-300">Platform Wallet Address:</span>
          <button
            @click="copyPlatformWalletAddress"
            class="text-yellow-400 hover:text-yellow-300 text-xs"
          >
            Copy
          </button>
        </div>
        <div class="font-mono text-sm text-white break-all">
          {{ platformWalletAddress }}
        </div>
      </div>
      
      <div class="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div class="flex items-start space-x-2">
          <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <div>
            <p class="text-sm text-green-400 font-medium">Send SOL to this address for instant tips!</p>
            <p class="text-xs text-dark-400 mt-1">
              Deposit SOL to your platform wallet to send tips without Phantom approval popups.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
</template>
