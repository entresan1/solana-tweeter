<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click="closeModal">
    <div class="bg-dark-800 rounded-2xl p-6 w-full max-w-md mx-4" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white flex items-center">
          <svg class="w-5 h-5 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          Tip {{ authorDisplay }}
        </h2>
        <button @click="closeModal" class="text-dark-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Tip Amount Input -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-dark-300 mb-2">
          Tip Amount (SOL)
        </label>
        <div class="relative">
          <input
            v-model="tipAmount"
            type="number"
            step="0.001"
            min="0.001"
            max="10"
            placeholder="0.001"
            class="input-field w-full pl-8 pr-4"
            :class="{ 'border-red-500': tipError }"
          />
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg class="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>
        </div>
        <p v-if="tipError" class="text-red-400 text-sm mt-1">{{ tipError }}</p>
        <p class="text-dark-400 text-sm mt-1">
          Minimum: 0.001 SOL • Maximum: 10 SOL
        </p>
      </div>

      <!-- Tip Message -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-dark-300 mb-2">
          Message (Optional)
        </label>
        <textarea
          v-model="tipMessage"
          placeholder="Say something nice..."
          rows="3"
          class="input-field w-full resize-none"
        ></textarea>
      </div>

      <!-- Payment Info -->
      <div class="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
        <div class="flex items-center justify-between text-sm">
          <span class="text-dark-300">Total Payment:</span>
          <span class="text-primary-400 font-semibold">{{ tipAmount || '0.000' }} SOL</span>
        </div>
        <div class="flex items-center justify-between text-sm mt-1">
          <span class="text-dark-300">Recipient:</span>
          <span class="text-dark-300 font-mono text-xs">{{ authorAddress.slice(0, 8) }}...{{ authorAddress.slice(-8) }}</span>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
        {{ errorMessage }}
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          @click="closeModal"
          class="btn-secondary flex-1"
          :disabled="isProcessing"
        >
          Cancel
        </button>
        <button
          @click="sendTip"
          :disabled="!canSendTip || isProcessing"
          class="btn-primary flex-1"
          :class="(!canSendTip || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''"
        >
          <span v-if="isProcessing" class="flex items-center justify-center">
            <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
          <span v-else>Send Tip</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { sendTipWithPayment } from '@src/lib/x402-tip-client';

interface Props {
  isOpen: boolean;
  authorAddress: string;
  authorDisplay: string;
  beaconId: number;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'tip-sent']);

const { wallet } = useWallet();

const tipAmount = ref('');
const tipMessage = ref('');
const isProcessing = ref(false);
const errorMessage = ref('');

// Validation
const tipError = computed(() => {
  if (!tipAmount.value) return '';
  const amount = parseFloat(tipAmount.value);
  if (isNaN(amount)) return 'Please enter a valid number';
  if (amount < 0.001) return 'Minimum tip is 0.001 SOL';
  if (amount > 10) return 'Maximum tip is 10 SOL';
  return '';
});

const canSendTip = computed(() => {
  return tipAmount.value && !tipError.value && wallet.value?.publicKey;
});

// Reset form when modal opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    tipAmount.value = '';
    tipMessage.value = '';
    errorMessage.value = '';
  }
});

const closeModal = () => {
  emit('close');
};

const sendTip = async () => {
  if (!canSendTip.value || !wallet.value?.publicKey) return;

  isProcessing.value = true;
  errorMessage.value = '';

  try {
    const amount = parseFloat(tipAmount.value);
    
    const result = await sendTipWithPayment(
      props.authorAddress,
      amount,
      tipMessage.value || '',
      props.beaconId,
      wallet.value
    );

    if (result.success) {
      emit('tip-sent', {
        amount,
        message: tipMessage.value,
        transaction: result.payment?.transaction,
        recipient: props.authorAddress
      });
      closeModal();
    } else {
      errorMessage.value = result.message || 'Failed to send tip';
    }
  } catch (error: any) {
    console.error('Tip error:', error);
    
    if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
      errorMessage.value = 'Transaction was cancelled by user';
    } else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient')) {
      errorMessage.value = 'Insufficient SOL balance. Please add funds to your wallet.';
    } else if (error.message?.includes('network') || error.message?.includes('connection')) {
      errorMessage.value = 'Network error. Please check your connection and try again.';
    } else {
      errorMessage.value = 'Failed to send tip. Please try again.';
    }
  } finally {
    isProcessing.value = false;
  }
};
</script>
