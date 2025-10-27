<template>
  <div class="relative">
    <!-- Notification Bell Icon -->
    <div class="relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6 text-dark-300 hover:text-primary-300 transition-colors duration-200 cursor-pointer"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        @click="handleClick"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      
      <!-- Notification Badge -->
      <div
        v-if="notificationCount > 0"
        class="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse"
      >
        {{ notificationCount > 99 ? '99+' : notificationCount }}
      </div>
    </div>
    
    <!-- Tooltip -->
    <div
      v-if="notificationCount > 0"
      class="absolute top-8 left-1/2 transform -translate-x-1/2 bg-dark-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50"
    >
      {{ notificationCount }} new beacon{{ notificationCount > 1 ? 's' : '' }}! Click to refresh
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { notificationService } from '@src/lib/notification-service';

const notificationCount = ref(0);
let unsubscribe: (() => void) | null = null;

const handleClick = () => {
  if (notificationCount.value > 0) {
    // Reset notification count and refresh the page
    notificationService.resetNotificationCount();
    window.location.reload();
  }
};

onMounted(() => {
  // Subscribe to notification updates
  unsubscribe = notificationService.subscribe((count) => {
    notificationCount.value = count;
  });
  
  // Get initial count
  notificationCount.value = notificationService.getNotificationCount();
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});
</script>
