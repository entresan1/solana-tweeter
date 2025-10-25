<script setup lang="ts">
  import { toRefs, computed } from 'vue';
  import { TweetModel } from '@src/models/tweet.model';
  import { useWorkspace } from '@src/hooks/useWorkspace';

  interface IProps {
    tweet: TweetModel;
  }

  const props = defineProps<IProps>();

  const { tweet } = toRefs(props);
  const { wallet } = useWorkspace();
  const authorRoute = computed(() => {
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
</script>

<template>
  <div class="card group relative overflow-hidden">
    
    <div class="flex items-start space-x-4 relative z-10">
      <!-- Enhanced Avatar -->
      <div class="flex-shrink-0">
        <div class="relative group/avatar">
          <div class="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center transition-all duration-300">
            <span class="text-white font-bold text-lg">
              {{ tweet?.author_display?.charAt(0)?.toUpperCase() }}
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
          <h3 class="font-semibold text-white group-hover:text-primary-300 transition-colors duration-300" :title="tweet?.author.toBase58()">
            <router-link :to="authorRoute" class="hover:text-primary-400 transition-all duration-300 hover:scale-105 inline-block">
              {{ tweet?.author_display }}
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
          <p class="whitespace-pre-wrap" v-text="tweet?.content"></p>
        </div>
        
        <!-- Enhanced Topic Tag -->
        <router-link
          v-if="tweet.topic"
          :to="{ name: 'Topics', params: { topic: tweet.topic } }"
          class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-primary-500/20 to-solana-500/20 text-primary-400 hover:from-primary-500/30 hover:to-solana-500/30 transition-all duration-300 hover-lift hover-scale border border-primary-500/20 hover:border-primary-500/40"
        >
          <svg class="w-4 h-4 mr-1.5 transition-transform duration-300 group-hover:rotate-12" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd" />
          </svg>
          #{{ tweet?.topic }}
        </router-link>
        
        <!-- Action Buttons -->
        <div class="flex items-center space-x-6 mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button class="flex items-center space-x-2 text-dark-400 hover:text-primary-400 transition-colors duration-300 hover:scale-110">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="text-sm">Like</span>
          </button>
          <button class="flex items-center space-x-2 text-dark-400 hover:text-primary-400 transition-colors duration-300 hover:scale-110">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span class="text-sm">Reply</span>
          </button>
          <button class="flex items-center space-x-2 text-dark-400 hover:text-primary-400 transition-colors duration-300 hover:scale-110">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span class="text-sm">Share</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
