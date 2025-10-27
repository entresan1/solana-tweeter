<script setup lang="ts">
  import { computed, toRefs, onMounted, onUnmounted, ref } from 'vue';
  import TweetCard from '@src/components/TweetCard.vue';
  import { TweetModel } from '@src/models/tweet.model';
  import { getTweets, on, off, isServiceInitialized, initializeTweetsService } from '@src/lib/http-tweets-service';
  import { PublicKey } from '@solana/web3.js';

  interface IProps {
    tweets: Array<TweetModel>;
    loading: boolean;
  }

  const props = defineProps<IProps>();

  const { tweets, loading } = toRefs(props);
  const sseTweets = ref<TweetModel[]>([]);
  const useSSE = ref(true);

  const orderedTweets = computed(() => {
    if (useSSE.value && isServiceInitialized() && sseTweets.value.length > 0) {
      return sseTweets.value.slice().sort((a, b) => b.timestamp - a.timestamp);
    }
    return tweets.value.slice().sort((a, b) => b.timestamp - a.timestamp);
  });

  // Convert beacon to TweetModel
  const convertBeaconToTweetModel = (beacon: any, index: number): TweetModel => {
    const mockKeyBytes = new Uint8Array(32);
    mockKeyBytes.fill(0);
    mockKeyBytes[0] = index + 1;
    mockKeyBytes[31] = 0x42;
    
    return new TweetModel(new PublicKey(mockKeyBytes), {
      author: new PublicKey(beacon.author),
      timestamp: { toNumber: () => beacon.timestamp / 1000 },
      topic: beacon.topic,
      content: beacon.content,
      id: beacon.id,
      treasuryTransaction: beacon.treasury_transaction || beacon.id,
      author_display: beacon.author_display || beacon.author?.toString()?.slice(0, 8) + '...' || 'Unknown User'
    });
  };

  // Handle new tweet from WebSocket
  const handleNewTweet = (tweet: any) => {
    console.log('📨 New tweet received via WebSocket:', tweet);
    const tweetModel = convertBeaconToTweetModel(tweet, sseTweets.value.length);
    sseTweets.value.unshift(tweetModel);
  };

  // Handle tweet update from WebSocket
  const handleTweetUpdate = (tweet: any) => {
    console.log('📨 Tweet update received via WebSocket:', tweet);
    const index = sseTweets.value.findIndex(t => t.id === tweet.id);
    if (index !== -1) {
      const tweetModel = convertBeaconToTweetModel(tweet, index);
      sseTweets.value[index] = tweetModel;
    }
  };

  // Handle tweets update from WebSocket (every 5 seconds)
  const handleTweetsUpdate = (tweets: any[]) => {
    console.log('📨 Tweets update received via WebSocket:', tweets);
    sseTweets.value = tweets.map((tweet, index) => convertBeaconToTweetModel(tweet, index));
  };

  // Handle initial tweets load from WebSocket
  const handleTweetsLoaded = (tweets: any[]) => {
    console.log('📨 Initial tweets loaded via WebSocket:', tweets);
    sseTweets.value = tweets.map((tweet, index) => convertBeaconToTweetModel(tweet, index));
  };

  onMounted(() => {
    // Initialize HTTP service
    initializeTweetsService();
    
    // Set up event listeners
    on('new_tweet', handleNewTweet);
    on('tweet_update', handleTweetUpdate);
    on('tweets_update', handleTweetsUpdate);
    on('tweets_loaded', handleTweetsLoaded);
    
    // Initialize with current data if available
    if (isServiceInitialized()) {
      const currentTweets = getTweets();
      if (currentTweets.length > 0) {
        sseTweets.value = currentTweets.map((tweet, index) => convertBeaconToTweetModel(tweet, index));
      }
    }
  });

  onUnmounted(() => {
    // Clean up event listeners
    off('new_tweet', handleNewTweet);
    off('tweet_update', handleTweetUpdate);
    off('tweets_update', handleTweetsUpdate);
    off('tweets_loaded', handleTweetsLoaded);
  });
</script>

<template>
  <div v-if="loading" class="p-8 text-dark-400 text-center">Loading...</div>
  <div v-else class="divide-y">
    <tweet-card
      v-for="tweet in orderedTweets"
      :key="tweet.key"
      :tweet="tweet"
    ></tweet-card>
  </div>
</template>
