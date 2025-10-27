<script setup lang="ts">
  import { onBeforeMount, ref } from 'vue';
  import TweetForm from '@src/components/TweetForm.vue';
  import TweetList from '@src/components/TweetList.vue';
  import TweetSearch from '@src/components/TweetSearch.vue';
  import { fetchTweets, searchBeacons } from '@src/api';
  import { TweetModel } from '@src/models/tweet.model';
  
  const tweets = ref<TweetModel[]>([]);
  const loading = ref(true);
  const searchTerm = ref('');
  const isSearching = ref(false);

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

  const search = async () => {
    if (!searchTerm.value.trim()) {
      // If search is empty, reload all tweets
      loading.value = true;
      try {
        const fetchedTweets = await fetchTweets();
        tweets.value = fetchedTweets;
        isSearching.value = false;
      } catch (error) {
        console.error('Error fetching tweets:', error);
      } finally {
        loading.value = false;
      }
      return;
    }

    loading.value = true;
    isSearching.value = true;
    
    try {
      const searchResults = await searchBeacons(searchTerm.value);
      tweets.value = searchResults;
      console.log('🔍 Search results:', searchResults.length);
    } catch (error) {
      console.error('Error searching beacons:', error);
    } finally {
      loading.value = false;
    }
  };

</script>

<template>
  <tweet-form @added="addTweet"></tweet-form>
  
  <!-- Search Bar -->
  <tweet-search
    v-model="searchTerm"
    placeholder="Search beacons by topic or content..."
    :disabled="loading"
    @search="search"
  >
    <template #icon>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </template>
  </tweet-search>
  
  <tweet-list :tweets="tweets" :loading="loading"></tweet-list>
</template>
