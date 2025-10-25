<script setup lang="ts">
  import { toRefs } from 'vue';

  interface IProps {
    modelValue: string;
    placeholder: string;
    disabled: boolean;
  }

  const emit = defineEmits(['search', 'update:modelValue']);
  const props = defineProps<IProps>();

  const { modelValue, placeholder, disabled } = toRefs(props);
</script>

<template>
  <div class="relative border-b border-dark-700">
    <input
      type="text"
      class="text-dark-100 w-full pl-16 pr-32 py-4 bg-dark-800/50 placeholder-dark-400 focus:outline-none focus:bg-dark-700/50 transition-all duration-300"
      :placeholder="placeholder"
      :value="modelValue"
      @input="emit('update:modelValue', $event)"
      @keydown.enter="emit('search')"
    />
    <div
      class="absolute left-0 inset-y-0 flex items-center justify-center pl-8 pr-2"
      :class="modelValue ? 'text-primary-400' : 'text-dark-400'"
    >
      <slot name="icon"></slot>
    </div>
    <div class="absolute right-0 inset-y-0 flex items-center pr-8">
      <button
        class="rounded-full px-4 py-1 font-semibold transition-all duration-300"
        :class="
          !disabled
            ? 'text-white bg-gradient-to-r from-primary-500 to-solana-500 hover:from-primary-600 hover:to-solana-600 hover:scale-105'
            : 'text-dark-500 bg-dark-700 cursor-not-allowed'
        "
        :disabled="disabled"
        @click="emit('search')"
      >
        Search
      </button>
    </div>
  </div>
</template>
