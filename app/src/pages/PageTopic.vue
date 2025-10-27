<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { fetchTweets, topicFilter } from '@src/api';
  import { useFromRoute } from '@src/hooks';
  import { TweetModel } from '@src/models/tweet.model';
  import TweetList from '@src/components/TweetList.vue';

  // Data.
  const router = useRouter();
  const tweets = ref<TweetModel[]>([]);
  const loading = ref(true);
  const topic = ref('');
  const viewedTopic = ref('');

  // Actions.
  const search = () => {
    router.push(`/topic/${topic.value}`);
  };

  const fetchTopicTweets = async () => {
    if (topic.value === viewedTopic.value) return;
    console.log('🏷️ fetchTopicTweets called with topic:', topic.value);
    try {
      loading.value = true;
      const fetchedTweets = await topicFilter(topic.value);
      console.log('🏷️ Fetched tweets for topic:', fetchedTweets.length);
      tweets.value = fetchedTweets;
      viewedTopic.value = topic.value;
    } finally {
      loading.value = false;
    }
  };

  // Router hooks.
  useFromRoute((route) => {
    console.log('🏷️ Router hook called with route:', route);
    topic.value = route.params.topic as string;
    console.log('🏷️ Topic from route params:', topic.value);
    if (topic.value) {
      fetchTopicTweets();
    } else {
      tweets.value = [];
      viewedTopic.value = '';
    }
  });
</script>

<template>
  <div v-if="viewedTopic">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-white mb-2">
        Topic: #{{ viewedTopic }}
      </h1>
      <p class="text-dark-400">
        {{ tweets.length }} beacon{{ tweets.length !== 1 ? 's' : '' }} found
      </p>
    </div>
    <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
    <div v-if="tweets.length === 0 && !loading" class="p-8 text-dark-400 text-center">
      No beacons found for this topic...
    </div>
  </div>
  <div v-else class="p-8 text-center">
    <h1 class="text-2xl font-bold text-white mb-4">Search by Topic</h1>
    <div class="max-w-md mx-auto">
      <div class="flex space-x-2">
        <input
          v-model="topic"
          type="text"
          placeholder="Enter a topic..."
          class="flex-1 px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          @keyup.enter="search"
        />
        <button
          @click="search"
          class="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          Search
        </button>
      </div>
    </div>
  </div>
</template>
