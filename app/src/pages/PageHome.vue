<script setup lang="ts">
  import { onBeforeMount, ref } from 'vue';
  import TweetForm from '@src/components/TweetForm.vue';
  import TweetList from '@src/components/TweetList.vue';
  import { fetchTweets } from '@src/api';
  import { TweetModel } from '@src/models/tweet.model';
  
  const tweets = ref<TweetModel[]>([]);
  const loading = ref(true);

  onBeforeMount(() => {
    console.log('PageHome: Fetching tweets...');
    fetchTweets()
      .then((fetchedTweets) => {
        console.log('PageHome: Fetched tweets:', fetchedTweets);
        console.log('PageHome: Number of tweets:', fetchedTweets.length);
        tweets.value = fetchedTweets;
      })
      .finally(() => (loading.value = false));
  });

  const addTweet = (tweet: TweetModel) => {
    console.log('📝 Adding new tweet to list:', tweet);
    tweets.value.unshift(tweet); // Add to beginning of list
    console.log('📝 Updated tweets list length:', tweets.value.length);
  };


</script>

<template>
  <tweet-form @added="addTweet"></tweet-form>
  
  <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
</template>
