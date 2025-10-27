<script setup lang="ts">
  import { computed, toRefs, onMounted, onUnmounted, ref } from 'vue';
  import TweetCard from '@src/components/TweetCard.vue';
  import { TweetModel } from '@src/models/tweet.model';
  import { getBeacons, on, off } from '@src/lib/sse-service';

  interface IProps {
    tweets: Array<TweetModel>;
    loading: boolean;
  }

  const props = defineProps<IProps>();

  const { tweets, loading } = toRefs(props);
  const sseTweets = ref<TweetModel[]>([]);
  const useSSE = ref(true);

  const orderedTweets = computed(() => {
    if (useSSE.value && sseTweets.value.length > 0) {
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
    
    return new TweetModel(new (window as any).solanaWeb3.PublicKey(mockKeyBytes), {
      author: new (window as any).solanaWeb3.PublicKey(beacon.author),
      timestamp: { toNumber: () => beacon.timestamp / 1000 },
      topic: beacon.topic,
      content: beacon.content,
      id: beacon.id,
      treasuryTransaction: beacon.treasury_transaction || beacon.id,
      author_display: beacon.author_display || beacon.author?.toString()?.slice(0, 8) + '...' || 'Unknown User'
    });
  };

  // Handle new beacon from SSE
  const handleNewBeacon = (beacon: any) => {
    console.log('📨 New beacon received via SSE:', beacon);
    const tweetModel = convertBeaconToTweetModel(beacon, sseTweets.value.length);
    sseTweets.value.unshift(tweetModel);
  };

  // Handle beacon update from SSE
  const handleBeaconUpdate = (beacon: any) => {
    console.log('📨 Beacon update received via SSE:', beacon);
    const index = sseTweets.value.findIndex(t => t.id === beacon.id);
    if (index !== -1) {
      const tweetModel = convertBeaconToTweetModel(beacon, index);
      sseTweets.value[index] = tweetModel;
    }
  };

  // Handle initial beacons load from SSE
  const handleBeaconsLoaded = (beacons: any[]) => {
    console.log('📨 Initial beacons loaded via SSE:', beacons);
    sseTweets.value = beacons.map((beacon, index) => convertBeaconToTweetModel(beacon, index));
  };

  onMounted(() => {
    // Set up SSE event listeners
    on('new_beacon', handleNewBeacon);
    on('beacon_update', handleBeaconUpdate);
    on('beacons_loaded', handleBeaconsLoaded);
    
    // Initialize with current SSE data
    const currentBeacons = getBeacons();
    if (currentBeacons.length > 0) {
      sseTweets.value = currentBeacons.map((beacon, index) => convertBeaconToTweetModel(beacon, index));
    }
  });

  onUnmounted(() => {
    // Clean up event listeners
    off('new_beacon', handleNewBeacon);
    off('beacon_update', handleBeaconUpdate);
    off('beacons_loaded', handleBeaconsLoaded);
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
