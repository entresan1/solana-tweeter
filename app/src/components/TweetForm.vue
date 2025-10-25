<script setup lang="ts">
  import { computed, ref, toRefs } from 'vue';
  import { sendTweet } from '@src/api';
  import {
    useSlug,
    useAutoResizeTextarea,
    useCountCharacterLimit,
  } from '@src/hooks';
  import { useWallet } from 'solana-wallets-vue';

  interface IProps {
    forcedTopic?: string;
  }

  // Props
  const props = defineProps<IProps>();
  const { forcedTopic = ref('') } = toRefs(props);

  // Form data.
  const content = ref('');
  const topic = ref('');
  const slugTopic = useSlug(topic);
  const effectiveTopic = computed(() => forcedTopic.value ?? slugTopic.value);

  // Auto-resize the content's textarea
  const textarea = ref();
  useAutoResizeTextarea(textarea);

  // Character limit / count-down
  const characterLimit = useCountCharacterLimit(content, 200);
  const characterLimitColour = computed(() => {
    if (characterLimit.value < 0) return 'text-red-400';
    if (characterLimit.value <= 10) return 'text-yellow-400';
    return 'text-dark-400';
  });

  // Permissions
  const { connected } = useWallet();
  const canTweet = computed(() => content.value && characterLimit.value > 0);

  // Actions
  const emit = defineEmits(['added']);
  const send = async () => {
    if (!canTweet.value) return;
    const tweet = await sendTweet(effectiveTopic.value, content.value);
    emit('added', tweet);
    topic.value = '';
    content.value = '';
  };

  // Handler
  const handleTopicChange = (event: Event) => {
    topic.value = (event?.target as HTMLInputElement)?.value;
  };
</script>

<template>
  <div v-if="connected" class="card mb-6 animate-fade-in">
    <!-- Content field -->
    <div class="mb-4">
      <textarea
        ref="textarea"
        v-model="content"
        rows="1"
        class="w-full text-xl text-dark-100 placeholder-dark-400 bg-transparent focus:outline-none resize-none"
        placeholder="What's happening on Solana?"
      ></textarea>
    </div>

    <div class="flex flex-wrap items-center justify-between">
      <!-- Topic field -->
      <div class="relative flex-1 max-w-xs">
        <input
          type="text"
          placeholder="Add a topic..."
          class="input-field pl-10 pr-4 py-2 text-sm"
          :value="effectiveTopic"
          :disabled="forcedTopic != null"
          @input="handleTopicChange"
        />
        <div class="absolute left-0 inset-y-0 flex pl-3 pr-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 m-auto"
            :class="effectiveTopic ? 'text-primary-400' : 'text-dark-400'"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        <!-- Character limit -->
        <div class="text-sm font-medium" :class="characterLimitColour">
          {{ characterLimit }} left
        </div>

        <!-- Tweet button -->
        <button
          class="btn-primary text-sm px-6 py-2"
          :disabled="!canTweet"
          :class="!canTweet ? 'opacity-50 cursor-not-allowed' : 'hover-glow'"
          @click="send"
        >
          <span class="flex items-center space-x-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
            <span>Tweet</span>
          </span>
        </button>
      </div>
    </div>
  </div>
  
  <div v-else class="card mb-6 text-center">
    <div class="flex flex-col items-center space-y-4 py-8">
      <div class="w-16 h-16 rounded-full bg-gradient-to-r from-primary-500/20 to-solana-500/20 flex items-center justify-center">
        <svg class="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div>
        <h3 class="text-lg font-semibold text-dark-200 mb-2">Connect Your Wallet</h3>
        <p class="text-dark-400">Connect your Solana wallet to start tweeting on the blockchain</p>
      </div>
    </div>
  </div>
</template>
