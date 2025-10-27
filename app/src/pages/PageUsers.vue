<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { fetchTweets, authorFilter } from '@src/api';
  import { useFromRoute } from '@src/hooks';
  import { TweetModel } from '@src/models/tweet.model';
  import TweetList from '@src/components/TweetList.vue';

  // Data.
  const router = useRouter();
  const tweets = ref<TweetModel[]>([]);
  const loading = ref(true);
  const author = ref('');
  const viewedAuthor = ref('');

  // Actions.
  const search = () => {
    router.push(`/users/${author.value}`);
  };

  const fetchAuthorTweets = async () => {
    if (author.value === viewedAuthor.value) return;
    console.log('👤 fetchAuthorTweets called with author:', author.value);
    try {
      loading.value = true;
      const fetchedTweets = await authorFilter(author.value);
      console.log('👤 Fetched tweets for author:', fetchedTweets.length);
      tweets.value = fetchedTweets;
      viewedAuthor.value = author.value;
    } finally {
      loading.value = false;
    }
  };

  // Router hooks.
  useFromRoute((route) => {
    console.log('👤 Router hook called with route:', route);
    author.value = route.params.author as string;
    console.log('👤 Author from route params:', author.value);
    if (author.value) {
      fetchAuthorTweets();
    } else {
      tweets.value = [];
      viewedAuthor.value = '';
    }
  });
</script>

<template>
  <div v-if="viewedAuthor">
    <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
    <div v-if="tweets.length === 0" class="p-8 text-dark-400 text-center">
      User not found...
    </div>
  </div>
</template>
