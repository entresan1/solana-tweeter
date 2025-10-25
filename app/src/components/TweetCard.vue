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
  <div class="card hover-lift animate-slide-up">
    <div class="flex items-start space-x-4">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        <div class="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center">
          <span class="text-white font-bold text-lg">
            {{ tweet?.author_display?.charAt(0)?.toUpperCase() }}
          </span>
        </div>
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <!-- Header -->
        <div class="flex items-center space-x-2 mb-2">
          <h3 class="font-semibold text-white" :title="tweet?.author.toBase58()">
            <router-link :to="authorRoute" class="hover:text-primary-400 transition-colors duration-200">
              {{ tweet?.author_display }}
            </router-link>
          </h3>
          <span class="text-dark-400">•</span>
          <time class="text-dark-400 text-sm" :title="tweet?.created_at">
            <router-link
              :to="{ name: 'Tweet', params: { tweet: tweet.publicKey.toBase58() } }"
              class="hover:text-primary-400 transition-colors duration-200"
            >
              {{ tweet?.created_ago }}
            </router-link>
          </time>
        </div>
        
        <!-- Tweet Content -->
        <div class="text-dark-100 leading-relaxed mb-4">
          <p class="whitespace-pre-wrap" v-text="tweet?.content"></p>
        </div>
        
        <!-- Topic Tag -->
        <router-link
          v-if="tweet.topic"
          :to="{ name: 'Topics', params: { topic: tweet.topic } }"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-primary-500/20 to-solana-500/20 text-primary-400 hover:from-primary-500/30 hover:to-solana-500/30 transition-all duration-200 hover-lift"
        >
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd" />
          </svg>
          #{{ tweet?.topic }}
        </router-link>
      </div>
    </div>
  </div>
</template>
