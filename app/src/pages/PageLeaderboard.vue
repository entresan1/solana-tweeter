<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface LeaderboardEntry {
  author: string;
  author_display: string;
  beacon_count?: number;
  like_count?: number;
  tip_count?: number;
  total_tips?: number;
}

interface LeaderboardData {
  beacons: LeaderboardEntry[];
  likes: LeaderboardEntry[];
  tips: LeaderboardEntry[];
}

const leaderboard = ref<LeaderboardData>({
  beacons: [],
  likes: [],
  tips: []
});

const loading = ref(true);
const error = ref('');

const loadLeaderboard = async () => {
  try {
    loading.value = true;
    error.value = '';
    
    const response = await fetch('/api/leaderboard');
    const data = await response.json();
    
    if (data.success) {
      leaderboard.value = data.leaderboard;
    } else {
      error.value = data.error || 'Failed to load leaderboard';
    }
  } catch (err) {
    console.error('Leaderboard load error:', err);
    error.value = 'Failed to load leaderboard data';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadLeaderboard();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-white mb-4">🏆 Leaderboard</h1>
        <p class="text-dark-400 text-lg">Top performers on Trench Beacon</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="w-8 h-8 animate-spin text-primary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p class="text-dark-400">Loading leaderboard...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-6 max-w-md mx-auto">
          <svg class="w-12 h-12 text-red-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <h3 class="text-lg font-semibold text-white mb-2">Error Loading Leaderboard</h3>
          <p class="text-red-400 text-sm">{{ error }}</p>
          <button 
            @click="loadLeaderboard"
            class="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>

      <!-- Leaderboard Content -->
      <div v-else class="grid md:grid-cols-3 gap-8">
        <!-- Top Beacons -->
        <div class="bg-gradient-to-br from-dark-800/50 to-dark-700/50 rounded-2xl p-6 border border-dark-600/50">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-solana-500 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5-5-5h5v-12h-5l5-5 5 5h-5v12z" />
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Most Beacons</h2>
              <p class="text-dark-400 text-sm">Top content creators</p>
            </div>
          </div>

          <div class="space-y-3">
            <div 
              v-for="(user, index) in leaderboard.beacons" 
              :key="user.author"
              class="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-600/50 transition-colors"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-r from-primary-500/20 to-solana-500/20 rounded-full flex items-center justify-center">
                  <span class="text-primary-400 font-bold text-sm">{{ index + 1 }}</span>
                </div>
                <div>
                  <p class="text-white font-medium">{{ user.author_display }}</p>
                  <p class="text-dark-400 text-xs font-mono">{{ user.author.slice(0, 8) }}...</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-primary-400 font-bold">{{ user.beacon_count }}</p>
                <p class="text-dark-400 text-xs">beacons</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Likes -->
        <div class="bg-gradient-to-br from-dark-800/50 to-dark-700/50 rounded-2xl p-6 border border-dark-600/50">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-10 h-10 bg-gradient-to-r from-pink-500 to-red-500 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Most Liked</h2>
              <p class="text-dark-400 text-sm">Most popular creators</p>
            </div>
          </div>

          <div class="space-y-3">
            <div 
              v-for="(user, index) in leaderboard.likes" 
              :key="user.author"
              class="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-600/50 transition-colors"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-full flex items-center justify-center">
                  <span class="text-pink-400 font-bold text-sm">{{ index + 1 }}</span>
                </div>
                <div>
                  <p class="text-white font-medium">{{ user.author_display }}</p>
                  <p class="text-dark-400 text-xs font-mono">{{ user.author.slice(0, 8) }}...</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-pink-400 font-bold">{{ user.like_count }}</p>
                <p class="text-dark-400 text-xs">likes</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Tips -->
        <div class="bg-gradient-to-br from-dark-800/50 to-dark-700/50 rounded-2xl p-6 border border-dark-600/50">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Most Tipped</h2>
              <p class="text-dark-400 text-sm">Highest earners</p>
            </div>
          </div>

          <div class="space-y-3">
            <div 
              v-for="(user, index) in leaderboard.tips" 
              :key="user.author"
              class="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg hover:bg-dark-600/50 transition-colors"
            >
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
                  <span class="text-yellow-400 font-bold text-sm">{{ index + 1 }}</span>
                </div>
                <div>
                  <p class="text-white font-medium">{{ user.author_display }}</p>
                  <p class="text-dark-400 text-xs font-mono">{{ user.author.slice(0, 8) }}...</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-yellow-400 font-bold">{{ user.total_tips?.toFixed(4) || 0 }}</p>
                <p class="text-dark-400 text-xs">SOL</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && !error && leaderboard.beacons.length === 0" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto text-dark-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
        <h3 class="text-xl font-semibold text-white mb-2">No Data Yet</h3>
        <p class="text-dark-400 mb-4">Be the first to create beacons and appear on the leaderboard!</p>
      </div>
    </div>
  </div>
</template>
