<script setup lang="ts">
  import { computed, ref, toRefs } from 'vue';
  import { sendTweet } from '@src/api';
  import {
    useSlug,
    useAutoResizeTextarea,
    useCountCharacterLimit,
  } from '@src/hooks';
  import { useWallet } from 'solana-wallets-vue';

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

  // Character limit / count-down
  const characterLimit = useCountCharacterLimit(content, 200);
  const characterLimitColour = computed(() => {
    if (characterLimit.value < 0) return 'text-red-400';
    if (characterLimit.value <= 10) return 'text-yellow-400';
    return 'text-dark-400';
  });

  // Permissions
  const { connected } = useWallet();
  const canTweet = computed(() => content.value && characterLimit.value > 0);

  // Actions
  const emit = defineEmits(['added']);
  const send = async () => {
    if (!canTweet.value) return;
    
    isSubmitting.value = true;
    errorMessage.value = '';
    
    try {
      const tweet = await sendTweet(effectiveTopic.value, content.value);
      emit('added', tweet);
      content.value = '';
      topic.value = '';
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
      
      <!-- Enhanced Content field -->
      <div class="mb-6">
        <div class="relative">
          <textarea
            ref="textarea"
            v-model="content"
            rows="1"
            class="w-full text-xl text-dark-100 placeholder-dark-400 bg-transparent focus:outline-none resize-none transition-all duration-300 focus:text-white"
            placeholder="What's happening on Solana?"
            @focus="onFocus = true"
            @blur="onFocus = false"
            @input="handleContentChange"
          ></textarea>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between">
        <!-- Enhanced Topic field -->
        <div class="relative flex-1 max-w-xs group/topic">
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
              :class="effectiveTopic ? 'text-primary-400 scale-110' : 'text-dark-400 group-hover/topic:text-primary-300'"
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
        
        <div class="flex items-center space-x-4">
          <!-- Enhanced Character limit -->
          <div class="text-sm font-medium transition-all duration-300" :class="characterLimitColour">
            <span class="inline-flex items-center space-x-1">
              <span>{{ characterLimit }}</span>
              <span class="text-xs opacity-70">left</span>
            </span>
          </div>

          <!-- Enhanced Tweet button -->
          <button
            class="btn-primary text-sm px-6 py-2 relative overflow-hidden group/btn"
            :disabled="!canTweet || isSubmitting"
            :class="(!canTweet || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'"
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
            The transaction signature becomes your beacon's unique ID on Solscan!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
