<script setup lang="ts">
  import { computed, ref, toRefs, onMounted, watch } from 'vue';
  import { sendTweet } from '@src/api';
  import {
    useSlug,
    useAutoResizeTextarea,
    useCountCharacterLimit,
  } from '@src/hooks';
  import { useWallet } from 'solana-wallets-vue';
  import { platformWalletService } from '@src/lib/platform-wallet';

  interface IProps {
    forcedTopic?: string;
  }

  // Props
  const props = defineProps<IProps>();
  const { forcedTopic = ref('') } = toRefs(props);

  // Form data.
  const content = ref('');
  const topic = ref('');
  const onFocus = ref(false);
  const isSubmitting = ref(false);
  const errorMessage = ref('');
  const slugTopic = useSlug(topic);
  const effectiveTopic = computed(() => forcedTopic.value ?? slugTopic.value);

  // Auto-resize the content's textarea
  const textarea = ref();
  useAutoResizeTextarea(textarea);

  // CA detection and character limit
  const isCA = computed(() => {
    const text = content.value.trim();
    // Check if text contains a valid Solana address (44 characters, base58)
    const caMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{44}\b/);
    return !!caMatch;
  });
  
  // Extract CA address from content
  const caAddress = computed(() => {
    const text = content.value.trim();
    const caMatch = text.match(/\b[1-9A-HJ-NP-Za-km-z]{44}\b/);
    return caMatch ? caMatch[0] : '';
  });

  // Character limit / count-down (no limit for CA)
  const characterLimit = useCountCharacterLimit(content, 200);
  const characterLimitColour = computed(() => {
    if (isCA.value) return 'text-green-400'; // Green for CA
    if (characterLimit.value < 0) return 'text-red-400';
    if (characterLimit.value <= 10) return 'text-yellow-400';
    return 'text-dark-400';
  });

  // Permissions
  const { connected, wallet } = useWallet();
  const canTweet = computed(() => content.value && characterLimit.value > 0);
  
  // Platform wallet state
  const usePlatformWallet = ref(false);
  const platformBalance = ref(0);
  const platformWalletAddress = ref('');

  // Load platform wallet data
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
      usePlatformWallet.value = false;
    }
  });

  // Load data on mount if already connected
  onMounted(() => {
    if (connected) {
      loadPlatformWalletData();
    }
  });

  // Actions
  const emit = defineEmits(['added', 'ca-bought']);
  
  // Buy CA beacon function
  const buyCABeacon = async (beacon: any) => {
    if (!connected.value) return;
    
    try {
      const response = await fetch('/api/buy-ca-beacon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          beaconId: beacon.id,
          userWallet: wallet.value?.publicKey?.toBase58() || '',
          contractAddress: beacon.content
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to buy CA beacon');
      }
      
      // Refresh platform wallet balance
      await loadPlatformWalletData();
      
      return data;
    } catch (error) {
      console.error('Buy CA beacon error:', error);
      throw error;
    }
  };
  
  const send = async () => {
    if (!canTweet.value) return;
    
    isSubmitting.value = true;
    errorMessage.value = '';
    
    try {
      // Always try platform wallet first, automatic fallback to Phantom
      const tweet = await sendTweet(effectiveTopic.value, content.value, true);
      
      // Load current user's profile data to ensure it's available for the new beacon
      if (wallet.value?.publicKey) {
        try {
          const { profileService } = await import('@src/lib/supabase');
          const userAddress = wallet.value.publicKey.toBase58();
          const profile = await profileService.getProfile(userAddress);
          console.log('👤 Loaded current user profile for new beacon:', profile);
        } catch (profileError) {
          console.warn('⚠️ Failed to load current user profile:', profileError);
        }
      }
      
      emit('added', tweet);
      content.value = '';
      topic.value = '';
      // Always refresh platform wallet balance after successful beacon
      await loadPlatformWalletData();
    } catch (error: any) {
      console.error('Beacon error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Transaction was cancelled by user')) {
        errorMessage.value = 'Transaction cancelled. You can try again when ready.';
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient')) {
        errorMessage.value = 'Insufficient SOL balance. Please add funds to your wallet.';
      } else if (error.message?.includes('Invalid treasury address')) {
        errorMessage.value = 'Configuration error. Please contact support.';
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorMessage.value = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('wallet') || error.message?.includes('Wallet')) {
        errorMessage.value = 'Wallet connection issue. Please reconnect your wallet.';
      } else if (error.message?.includes('content and author are required')) {
        errorMessage.value = 'Please enter content for your beacon.';
      } else {
        errorMessage.value = 'Failed to send beacon. Please try again.';
      }
    } finally {
      isSubmitting.value = false;
    }
  };

  // Handler
  const handleTopicChange = (event: Event) => {
    topic.value = (event?.target as HTMLInputElement)?.value;
    errorMessage.value = ''; // Clear error when user types
  };
  
  const handleContentChange = () => {
    errorMessage.value = ''; // Clear error when user types
  };
</script>

<template>
  <div v-if="connected" class="card mb-6 group relative overflow-hidden">
    
    <div class="relative z-10">
      <!-- Treasury Info -->
      <div class="mb-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg text-primary-300 text-sm">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
          <span>Each beacon costs 0.001 SOL and creates an on-chain transaction. Transaction signature becomes your beacon ID!</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>
      </div>
      
      <!-- Enhanced Content field - Much Clearer Input Area -->
      <div class="mb-6">
        <div class="relative">
          <!-- Clear input border and focus area -->
          <div class="relative border-2 border-dark-600 rounded-xl p-4 transition-all duration-300 hover:border-dark-500 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 bg-dark-800/30">
            <textarea
              ref="textarea"
              v-model="content"
              rows="1"
              class="w-full text-xl text-dark-100 placeholder-dark-500 bg-transparent focus:outline-none resize-none transition-all duration-300 focus:text-white"
              :placeholder="isCA ? 'Enter Contract Address (44 characters)...' : 'What\'s happening on Solana?'"
              @focus="onFocus = true"
              @blur="onFocus = false"
              @input="handleContentChange"
            ></textarea>
            
            <!-- Clear writing indicator -->
            <div class="absolute top-2 right-2 text-xs text-dark-500 pointer-events-none">
              <span v-if="!content.trim()" class="flex items-center space-x-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <span>Write here</span>
              </span>
              <span v-else class="text-green-400">
                ✓ Ready to beam
              </span>
            </div>
          </div>
        </div>
        
        <!-- Enhanced CA Detection Indicator -->
        <div v-if="isCA" class="mt-3 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div>
                <div class="flex items-center space-x-2">
                  <span class="text-green-400 font-semibold text-sm">Contract Address Detected!</span>
                  <span class="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full font-medium animate-pulse">TRADABLE</span>
                </div>
                <p class="text-green-300/80 text-xs mt-1">This will create a token beacon that others can buy directly</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-green-400 font-mono bg-green-500/10 px-3 py-1 rounded-lg">
                {{ caAddress.slice(0, 8) }}...{{ caAddress.slice(-8) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Simplified Bottom Controls -->
      <div class="flex items-center justify-between">
        <!-- Topic field - simplified -->
        <div class="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Add a topic..."
            class="input-field pl-10 pr-4 py-2 text-sm transition-all duration-300 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500"
            :value="effectiveTopic"
            :disabled="forcedTopic != null"
            @input="handleTopicChange"
          />
          <div class="absolute left-0 inset-y-0 flex pl-3 pr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 m-auto transition-all duration-300"
              :class="effectiveTopic ? 'text-primary-400 scale-110' : 'text-dark-400'"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
        </div>
        
        <!-- Right side - Character count and Send button -->
        <div class="flex items-center space-x-4">
          <!-- Character limit - simplified -->
          <div class="text-sm font-medium transition-all duration-300" :class="characterLimitColour">
            <span v-if="isCA">CA Detected</span>
            <span v-else>{{ characterLimit }} left</span>
          </div>

          <!-- Send button - more prominent -->
          <button
            class="btn-primary text-sm px-6 py-2 relative overflow-hidden group/btn"
            :disabled="!canTweet || isSubmitting"
            :class="(!canTweet || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'"
            :title="!content.trim() ? 'Please enter content' : characterLimit <= 0 ? 'Content too long' : 'Smart beacon: Uses platform wallet if available, falls back to Phantom'"
            @click="send"
          >
            <span class="flex items-center space-x-2 relative z-10">
              <svg v-if="!isSubmitting" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ isSubmitting ? 'Sending...' : 'Beacon' }}</span>
            </span>
          </button>
        </div>
      </div>
      
      <!-- Smart Payment Info - moved below and simplified -->
      <div v-if="connected && platformWalletAddress" class="mt-3 text-xs text-dark-400 text-center">
        <span class="flex items-center justify-center space-x-2">
          <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          <span>Smart Payment: Platform wallet ({{ platformBalance.toFixed(4) }} SOL) → Phantom fallback</span>
        </span>
      </div>

      <!-- Beacon is sending message -->
      <div v-if="isSubmitting" class="mt-3 text-center">
        <div class="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-lg text-primary-300 text-sm">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Beacon is sending...</span>
        </div>
      </div>
    </div>
  </div>
  
  <div v-else class="card mb-6 text-center">
    <div class="flex flex-col items-center space-y-6 py-8">
      <div class="relative">
        <div class="w-16 h-16 rounded-full bg-gradient-to-r from-primary-500/20 to-solana-500/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
      <div class="space-y-2">
        <h3 class="text-lg font-semibold text-dark-200">Connect Your Wallet</h3>
        <p class="text-dark-400">Connect your Solana wallet to start beaming on the blockchain</p>
        <div class="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
          <p class="text-sm text-primary-300">
            Each beacon costs 0.001 SOL and creates an on-chain transaction.
            Smart payment: Uses platform wallet if available, falls back to Phantom wallet.
            The transaction signature becomes your beacon's unique ID on Solscan!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
