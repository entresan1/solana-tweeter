<script setup lang="ts">
  import { toRefs, computed, ref, onMounted } from 'vue';
  import { TweetModel } from '@src/models/tweet.model';
  import { useWorkspace } from '@src/hooks/useWorkspace';
  import { profileService, interactionService } from '@src/lib/supabase';

  interface IProps {
    tweet: TweetModel;
  }

  const props = defineProps<IProps>();

  const { tweet } = toRefs(props);
  const { wallet } = useWorkspace();
  const authorProfile = ref(null);
  const authorDisplayName = ref('');
  const authorAvatar = ref('');
  const isLiked = ref(false);
  const likeCount = ref(0);
  const showReplyModal = ref(false);
  const replyContent = ref('');
  const replies = ref<any[]>([]);
  const showReplies = ref(false);
  const loadingReplies = ref(false);

  onMounted(async () => {
    console.log('🎯 TweetCard onMounted called');
    console.log('🎯 tweet.value:', tweet.value);
    console.log('🎯 tweet.value?.id:', tweet.value?.id);
    console.log('🎯 tweet.value?.author:', tweet.value?.author);
    
    if (tweet.value?.author) {
      try {
        const profile = await profileService.getProfile(tweet.value.author.toBase58());
        if (profile) {
          authorProfile.value = profile;
          authorDisplayName.value = profile.nickname || tweet.value.author.toBase58().slice(0, 8) + '...';
          authorAvatar.value = profile.profile_picture_url || '';
        } else {
          authorDisplayName.value = tweet.value.author.toBase58().slice(0, 8) + '...';
        }
      } catch (error) {
        console.error('Error loading author profile:', error);
        authorDisplayName.value = tweet.value.author.toBase58().slice(0, 8) + '...';
      }
    }

    // Load like status and count
    await loadLikeData();
    
    // Automatically load replies
    await loadReplies();
    showReplies.value = true;
  });

  const loadLikeData = async () => {
    console.log('🔍 loadLikeData called');
    console.log('🔍 tweet.value:', tweet.value);
    console.log('🔍 tweet.value?.id:', tweet.value?.id);
    
    if (!tweet.value?.id) {
      console.log('❌ Missing required data - tweet ID');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      console.log('🔍 Loading like data for beacon ID:', beaconId);
      
      // Only get the like count, skip the hasUserLiked check to avoid 406 errors
      console.log('🔍 Calling interactionService.getLikeCount...');
      const count = await interactionService.getLikeCount(beaconId);
      console.log('🔍 getLikeCount result:', count);
      
      // Set liked to false initially (will be updated when user actually likes)
      isLiked.value = false;
      likeCount.value = count;
      console.log('✅ Like data loaded successfully:', { liked: false, count });
    } catch (error: any) {
      console.error('❌ Error loading like data:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const loadReplies = async () => {
    if (!tweet.value?.id) return;
    
    try {
      loadingReplies.value = true;
      console.log('💬 Loading replies for beacon ID:', tweet.value.id);
      
      const beaconReplies = await interactionService.getBeaconReplies(tweet.value.id);
      replies.value = beaconReplies;
      console.log('💬 Loaded replies:', beaconReplies);
    } catch (error: any) {
      console.error('❌ Error loading replies:', error);
    } finally {
      loadingReplies.value = false;
    }
  };

  const toggleReplies = async () => {
    if (!showReplies.value) {
      await loadReplies();
    }
    showReplies.value = !showReplies.value;
  };

  const authorRoute = computed(() => {
    if (!tweet.value?.author) {
      return { name: 'Home' };
    }
    
    if (
      wallet.value &&
      wallet.value.publicKey.toBase58() === tweet.value.author.toBase58()
    ) {
      return { name: 'Profile' };
    } else {
      return {
        name: 'Users',
        params: { author: tweet.value.author.toBase58() },
      };
    }
  });

  // Action handlers
  const handleLike = async () => {
    console.log('❤️ handleLike called');
    console.log('❤️ wallet.value?.publicKey:', wallet.value?.publicKey);
    console.log('❤️ tweet.value?.id:', tweet.value?.id);
    console.log('❤️ isLiked.value:', isLiked.value);
    console.log('❤️ likeCount.value:', likeCount.value);
    
    if (!wallet.value?.publicKey) {
      console.log('❌ Wallet not connected. Please connect your wallet first.');
      alert('Please connect your wallet first to like beacons.');
      return;
    }
    
    if (!tweet.value?.id) {
      console.log('❌ Missing tweet ID');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      const userWallet = wallet.value.publicKey.toBase58();
      console.log('❤️ Toggling like for beacon ID:', beaconId);
      console.log('❤️ User wallet:', userWallet);
      
      if (isLiked.value) {
        console.log('❤️ Unliking beacon...');
        await interactionService.unlikeBeacon(beaconId, userWallet);
        isLiked.value = false;
        likeCount.value--;
        console.log('✅ Unliked beacon successfully');
      } else {
        console.log('❤️ Liking beacon...');
        await interactionService.likeBeacon(beaconId, userWallet);
        isLiked.value = true;
        likeCount.value++;
        console.log('✅ Liked beacon successfully');
      }
    } catch (error: any) {
      console.error('❌ Error toggling like:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const handleReply = () => {
    // Toggle reply form visibility
    if (showReplyModal.value) {
      // If reply form is open, close it
      showReplyModal.value = false;
    } else {
      // If reply form is closed, open it and load replies if needed
      if (!showReplies.value) {
        toggleReplies(); // Load and show replies
      }
      showReplyModal.value = true; // Show reply form
    }
  };

  const submitReply = async () => {
    console.log('💬 submitReply called');
    console.log('💬 wallet.value?.publicKey:', wallet.value?.publicKey);
    console.log('💬 tweet.value?.id:', tweet.value?.id);
    console.log('💬 replyContent.value:', replyContent.value);
    console.log('💬 replyContent.value.trim():', replyContent.value.trim());
    
    if (!wallet.value?.publicKey || !tweet.value?.id || !replyContent.value.trim()) {
      console.log('❌ Missing wallet, tweet ID, or reply content');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      const userWallet = wallet.value.publicKey.toBase58();
      const content = replyContent.value.trim();
      console.log('💬 Submitting reply for beacon ID:', beaconId);
      console.log('💬 User wallet:', userWallet);
      console.log('💬 Reply content:', content);
      
      console.log('💬 Calling interactionService.replyToBeacon...');
      await interactionService.replyToBeacon(beaconId, userWallet, content);
      console.log('✅ Reply submitted successfully');
      
      replyContent.value = '';
      showReplyModal.value = false;
      console.log('✅ Reply form cleared and hidden');
      
      // Refresh replies if they're currently shown
      if (showReplies.value) {
        await loadReplies();
      }
    } catch (error: any) {
      console.error('❌ Error submitting reply:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const handleShare = () => {
    const walletAddress = wallet.value?.publicKey?.toBase58() || 'Anonymous';
    const firstThree = walletAddress.slice(0, 3);
    const solscanUrl = `https://solscan.io/tx/${tweet.value?.treasuryTransaction}`;
    
    const shareText = `Oh you still tweet? What a loser!

Beacon like all the cool things so that all of your horrible horrrundous thoughts becomes part of the on-chain.

Anyway ${firstThree} said ${tweet.value?.content}

Solscan: ${solscanUrl}
Come beacon at @https://trenchbeacon.com/`;

    if (navigator.share) {
      navigator.share({
        title: 'Check out this beacon on Trench Beacon',
        text: shareText
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Beacon share text copied to clipboard!');
    }
  };
</script>

<template>
  <div class="card group relative overflow-hidden">
    
    <div class="flex items-start space-x-4 relative z-10">
      <!-- Enhanced Avatar -->
      <div class="flex-shrink-0">
        <div class="relative group/avatar">
          <div class="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center overflow-hidden transition-all duration-300">
            <img 
              v-if="authorAvatar" 
              :src="authorAvatar" 
              :alt="authorDisplayName"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-white font-bold text-lg">
              {{ authorDisplayName.charAt(0).toUpperCase() }}
            </span>
          </div>
          <!-- Online Status Indicator -->
          <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-dark-900"></div>
        </div>
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <!-- Enhanced Header -->
        <div class="flex items-center space-x-2 mb-3">
          <h3 class="font-semibold text-white group-hover:text-primary-300 transition-colors duration-300" :title="tweet?.author?.toBase58() || 'Unknown author'">
            <router-link :to="authorRoute" class="hover:text-primary-400 transition-all duration-300 hover:scale-105 inline-block">
              {{ authorDisplayName || tweet?.author_display || 'Unknown User' }}
            </router-link>
          </h3>
          <span class="text-dark-400">•</span>
          <time class="text-dark-400 text-sm hover:text-primary-400 transition-colors duration-300" :title="tweet?.created_at">
            <router-link
              :to="{ name: 'Tweet', params: { tweet: tweet.publicKey.toBase58() } }"
              class="hover:text-primary-400 transition-all duration-300"
            >
              {{ tweet?.created_ago }}
            </router-link>
          </time>
          <!-- Verified Badge -->
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        
        <!-- Enhanced Tweet Content -->
        <div class="text-dark-100 leading-relaxed mb-4 group-hover:text-white transition-colors duration-300">
          <p class="whitespace-pre-wrap" v-text="tweet?.content || 'No content available'"></p>
        </div>
        
        <!-- Enhanced Topic Tag -->
        <router-link
          v-if="tweet?.topic"
          :to="{ name: 'Topics', params: { topic: tweet?.topic } }"
          class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-primary-500/20 to-solana-500/20 text-primary-400 hover:from-primary-500/30 hover:to-solana-500/30 transition-all duration-300 hover-lift hover-scale border border-primary-500/20 hover:border-primary-500/40"
        >
          <svg class="w-4 h-4 mr-1.5 transition-transform duration-300 group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd" />
          </svg>
          #{{ tweet?.topic }}
        </router-link>
        
        <!-- Treasury Transaction Link -->
        <div class="mt-3 p-2 bg-dark-800/50 border border-dark-700 rounded-lg">
          <div class="flex items-center space-x-2 text-xs text-dark-400">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            <span>On-chain transaction:</span>
            <a 
              :href="`https://solscan.io/tx/${tweet.treasuryTransaction || tweet.publicKey.toBase58()}`" 
              target="_blank" 
              class="text-primary-400 hover:text-primary-300 transition-colors duration-300 hover:underline"
            >
              View on Solscan
            </a>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-6 mt-4">
        <button 
          @click="handleLike"
          :class="[
            'flex items-center space-x-2 transition-colors duration-300 hover:scale-110',
            isLiked ? 'text-red-400' : 'text-dark-400 hover:text-red-400'
          ]"
        >
          <svg class="w-5 h-5" :fill="isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span class="text-sm">{{ likeCount }}</span>
        </button>
          <button 
            @click="handleReply"
            class="flex items-center space-x-2 text-dark-400 hover:text-blue-400 transition-colors duration-300 hover:scale-110"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span class="text-sm">{{ showReplies ? 'Reply' : 'Replies' }}</span>
          </button>
          <button 
            @click="handleShare"
            class="flex items-center space-x-2 text-dark-400 hover:text-green-400 transition-colors duration-300 hover:scale-110"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span class="text-sm">Share</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Replies Section - Only show if there are replies -->
    <div v-if="showReplies && replies.length > 0" class="mt-4 border-t border-dark-700 pt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium text-dark-300">Replies ({{ replies.length }})</h4>
        <button 
          @click="toggleReplies"
          class="text-xs text-dark-400 hover:text-primary-400 transition-colors"
        >
          Hide
        </button>
      </div>
      
      <div v-if="loadingReplies" class="text-center py-4">
        <div class="text-dark-400 text-sm">Loading replies...</div>
      </div>
      
      <!-- Scrollable replies container for 3+ replies -->
      <div 
        v-else 
        :class="[
          'space-y-3',
          replies.length > 3 ? 'max-h-64 overflow-y-auto pr-2' : ''
        ]"
      >
        <div 
          v-for="reply in replies" 
          :key="reply.id"
          class="bg-dark-800/30 border border-dark-700 rounded-lg p-3"
        >
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center flex-shrink-0">
              <span class="text-white font-bold text-sm">
                {{ reply.user_wallet?.slice(0, 2).toUpperCase() || 'U' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2 mb-1">
                <span class="text-sm font-medium text-white">
                  {{ reply.user_wallet?.slice(0, 8) + '...' || 'Anonymous' }}
                </span>
                <span class="text-xs text-dark-400">
                  {{ new Date(reply.created_at).toLocaleString() }}
                </span>
              </div>
              <p class="text-dark-100 text-sm">{{ reply.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inline Reply Box -->
    <div v-if="showReplyModal" class="mt-4 p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
      <div class="flex flex-col space-y-3">
        <textarea
          v-model="replyContent"
          placeholder="Write your reply..."
          class="input-field w-full h-20 resize-none"
          maxlength="280"
        ></textarea>
        <div class="flex justify-center">
          <button 
            @click="submitReply"
            :disabled="!replyContent.trim()"
            class="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

