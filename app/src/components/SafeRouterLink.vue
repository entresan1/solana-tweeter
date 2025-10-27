<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { isValidLocation } from '@src/router/safeNavigate';

const props = defineProps<{ to: any }>();
const safeTo = computed(() => (isValidLocation(props.to) ? props.to : null));
</script>

<template>
  <RouterLink v-if="safeTo" :to="safeTo"><slot /></RouterLink>
  <span v-else class="text-dark-400 cursor-not-allowed"><slot /></span>
</template>
