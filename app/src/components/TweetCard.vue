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

  onMounted(async () => {
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
  });

  const loadLikeData = async () => {
    if (!tweet.value?.id || !wallet.value?.publicKey) return;
    
    try {
      const beaconId = tweet.value.id;
      console.log('Loading like data for beacon ID:', beaconId);
      
      const [liked, count] = await Promise.all([
        interactionService.hasUserLiked(beaconId, wallet.value.publicKey.toBase58()),
        interactionService.getLikeCount(beaconId)
      ]);
      isLiked.value = liked;
      likeCount.value = count;
    } catch (error) {
      console.error('Error loading like data:', error);
    }
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
    if (!wallet.value?.publicKey || !tweet.value?.id) return;
    
    try {
      const beaconId = tweet.value.id;
      console.log('Toggling like for beacon ID:', beaconId);
      
      if (isLiked.value) {
        await interactionService.unlikeBeacon(beaconId, wallet.value.publicKey.toBase58());
        isLiked.value = false;
        likeCount.value--;
        console.log('Unliked beacon');
      } else {
        await interactionService.likeBeacon(beaconId, wallet.value.publicKey.toBase58());
        isLiked.value = true;
        likeCount.value++;
        console.log('Liked beacon');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleReply = () => {
    showReplyModal.value = !showReplyModal.value;
  };

  const submitReply = async () => {
    if (!wallet.value?.publicKey || !tweet.value?.id || !replyContent.value.trim()) return;
    
    try {
      const beaconId = tweet.value.id;
      console.log('Submitting reply for beacon ID:', beaconId);
      
      await interactionService.replyToBeacon(
        beaconId, 
        wallet.value.publicKey.toBase58(), 
        replyContent.value.trim()
      );
      replyContent.value = '';
      showReplyModal.value = false;
      console.log('Reply submitted successfully');
    } catch (error) {
      console.error('Error submitting reply:', error);
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
        <div class="flex items-center space-x-6 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
            <span class="text-sm">Reply</span>
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

    <!-- Inline Reply Box -->
    <div v-if="showReplyModal" class="mt-4 p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
      <div class="flex items-end space-x-3">
        <textarea
          v-model="replyContent"
          placeholder="Write your reply..."
          class="input-field flex-1 h-20 resize-none"
          maxlength="280"
        ></textarea>
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
</template>
