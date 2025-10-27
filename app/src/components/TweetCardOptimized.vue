<template>
  <div class="bg-dark-800 rounded-lg p-4 mb-4 border border-dark-700 hover:border-primary-500/50 transition-all duration-200">
    <!-- Header -->
    <div class="flex items-start justify-between mb-3">
      <div class="flex items-center space-x-3">
        <!-- Profile Picture -->
        <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-solana-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {{ authorInitials }}
        </div>
        
        <!-- Author Info -->
        <div>
          <div class="flex items-center space-x-2">
            <h3 class="text-white font-semibold text-sm">
              {{ authorDisplay }}
            </h3>
            <span class="text-dark-400 text-xs">
              {{ formatTimestamp(tweet.timestamp) }}
            </span>
          </div>
          <p class="text-dark-400 text-xs font-mono">
            {{ tweet.author?.toString().slice(0, 8) }}...{{ tweet.author?.toString().slice(-4) }}
          </p>
        </div>
      </div>
      
      <!-- Share Button -->
      <button
        @click="handleShareLink"
        class="text-dark-400 hover:text-primary-500 transition-colors"
        title="Share beacon"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      </button>
    </div>

    <!-- Content -->
    <div class="mb-4">
      <p class="text-dark-100 text-sm leading-relaxed whitespace-pre-wrap">{{ tweet.content }}</p>
      
      <!-- Topic Tag -->
      <div v-if="tweet.topic" class="mt-2">
        <span class="inline-block bg-primary-500/20 text-primary-400 text-xs px-2 py-1 rounded-full">
          #{{ tweet.topic }}
        </span>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="flex items-center justify-between text-sm text-dark-400 mb-3">
      <div class="flex items-center space-x-4">
        <!-- Like Count -->
        <div class="flex items-center space-x-1">
          <svg class="w-4 h-4" :class="{ 'text-red-500': beaconData?.likeData?.isLiked }" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
          </svg>
          <span>{{ beaconData?.likeData?.count || 0 }}</span>
        </div>
        
        <!-- Rug Count -->
        <div class="flex items-center space-x-1">
          <svg class="w-4 h-4" :class="{ 'text-orange-500': beaconData?.rugData?.isRugged }" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ beaconData?.rugData?.count || 0 }}</span>
        </div>
        
        <!-- Tip Count -->
        <div class="flex items-center space-x-1">
          <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
          </svg>
          <span>{{ beaconData?.tipMessages?.length || 0 }}</span>
        </div>
      </div>
      
      <!-- Total Tips Amount -->
      <div v-if="totalTipsAmount > 0" class="text-yellow-400 font-semibold">
        {{ totalTipsAmount.toFixed(3) }} SOL
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between pt-3 border-t border-dark-700">
      <div class="flex items-center space-x-4">
        <!-- Like Button -->
        <button
          @click="toggleLike"
          :disabled="loading"
          class="flex items-center space-x-1 text-dark-400 hover:text-red-500 transition-colors disabled:opacity-50"
        >
          <svg class="w-4 h-4" :class="{ 'text-red-500': beaconData?.likeData?.isLiked }" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
          </svg>
          <span>Like</span>
        </button>
        
        <!-- Rug Button -->
        <button
          @click="toggleRug"
          :disabled="loading"
          class="flex items-center space-x-1 text-dark-400 hover:text-orange-500 transition-colors disabled:opacity-50"
        >
          <svg class="w-4 h-4" :class="{ 'text-orange-500': beaconData?.rugData?.isRugged }" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>Rug</span>
        </button>
        
        <!-- Tip Button -->
        <button
          @click="showTipModal = true"
          class="flex items-center space-x-1 text-dark-400 hover:text-yellow-500 transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
          </svg>
          <span>Tip</span>
        </button>
      </div>
      
      <!-- View Replies Button -->
      <button
        @click="toggleReplies"
        class="text-dark-400 hover:text-primary-500 transition-colors text-sm"
      >
        {{ showReplies ? 'Hide' : 'View' }} Replies ({{ replies.length }})
      </button>
    </div>

    <!-- Replies Section -->
    <div v-if="showReplies" class="mt-4 pt-4 border-t border-dark-700">
      <div v-if="loadingReplies" class="text-center text-dark-400 py-4">
        Loading replies...
      </div>
      <div v-else-if="replies.length === 0" class="text-center text-dark-400 py-4">
        No replies yet
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="reply in replies"
          :key="reply.id"
          class="bg-dark-700 rounded-lg p-3"
        >
          <div class="flex items-center space-x-2 mb-2">
            <div class="w-6 h-6 bg-gradient-to-br from-primary-500 to-solana-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {{ reply.author_display?.charAt(0) || '?' }}
            </div>
            <span class="text-white text-sm font-semibold">{{ reply.author_display || 'Anonymous' }}</span>
            <span class="text-dark-400 text-xs">{{ formatTimestamp(reply.timestamp) }}</span>
          </div>
          <p class="text-dark-100 text-sm">{{ reply.content }}</p>
        </div>
      </div>
    </div>

    <!-- Tip Modal would go here -->
    <!-- ... -->
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { unifiedDataService } from '@src/lib/unified-data-service';

const props = defineProps<{
  tweet: any;
}>();

const { wallet } = useWallet();

// Reactive data
const showReplies = ref(false);
const replies = ref<any[]>([]);
const loadingReplies = ref(false);
const showTipModal = ref(false);
const loading = ref(false);

// Get beacon data from unified service
const beaconData = computed(() => {
  return unifiedDataService.getBeaconWithData(props.tweet.id).value;
});

// Computed properties
const authorDisplay = computed(() => {
  return props.tweet.author_display || 
         props.tweet.author?.toString().slice(0, 8) + '...' || 
         'Unknown User';
});

const authorInitials = computed(() => {
  return authorDisplay.value
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
});

const totalTipsAmount = computed(() => {
  if (!beaconData.value?.tipMessages) return 0;
  return beaconData.value.tipMessages.reduce((sum: number, tip: any) => sum + (tip.amount || 0), 0);
});

// Methods
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};

const handleShareLink = async () => {
  const url = `${window.location.origin}/beacon/${props.tweet.id}`;
  try {
    await navigator.clipboard.writeText(url);
    // Show success message
  } catch (error) {
    console.error('Failed to copy link:', error);
  }
};

const toggleLike = async () => {
  if (!wallet.value?.publicKey) return;
  
  loading.value = true;
  try {
    // Implement like toggle logic
    // This would call the unified service
  } catch (error) {
    console.error('Error toggling like:', error);
  } finally {
    loading.value = false;
  }
};

const toggleRug = async () => {
  if (!wallet.value?.publicKey) return;
  
  loading.value = true;
  try {
    // Implement rug toggle logic
    // This would call the unified service
  } catch (error) {
    console.error('Error toggling rug:', error);
  } finally {
    loading.value = false;
  }
};

const toggleReplies = async () => {
  if (!showReplies.value) {
    await loadReplies();
  }
  showReplies.value = !showReplies.value;
};

const loadReplies = async () => {
  if (!props.tweet.id) return;
  
  loadingReplies.value = true;
  try {
    // This would use the unified service instead of direct API calls
    // replies.value = await unifiedDataService.getReplies(props.tweet.id);
  } catch (error) {
    console.error('Error loading replies:', error);
  } finally {
    loadingReplies.value = false;
  }
};

// Watch for tweet changes
watch(() => props.tweet.id, () => {
  if (showReplies.value) {
    loadReplies();
  }
});

onMounted(() => {
  // All data is now loaded by the unified service
  // No individual API calls needed here
});
</script>
