<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click="closeModal">
    <div class="bg-dark-800 rounded-2xl p-6 w-full max-w-md mx-4" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white flex items-center">
          <svg class="w-6 h-6 mr-3 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          Platform Wallet
        </h2>
        <button @click="closeModal" class="text-dark-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Platform Wallet Info -->
      <div class="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg">
        <h3 class="text-sm font-medium text-primary-400 mb-2">Your Platform Wallet</h3>
        <div class="flex items-center justify-between text-sm">
          <span class="text-dark-300">Address:</span>
          <div class="flex items-center space-x-2">
            <span class="font-mono text-xs">{{ platformWalletAddress.slice(0, 8) }}...{{ platformWalletAddress.slice(-8) }}</span>
            <button @click="copyAddress" class="text-primary-400 hover:text-primary-300">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex items-center justify-between text-sm mt-2">
          <span class="text-dark-300">Balance:</span>
          <span class="text-primary-400 font-semibold">{{ platformBalance.toFixed(6) }} SOL</span>
        </div>
      </div>

      <!-- Benefits -->
      <div class="mb-6">
        <h3 class="text-sm font-medium text-white mb-3">Platform Wallet Benefits</h3>
        <ul class="space-y-2 text-sm text-dark-300">
          <li class="flex items-start">
            <svg class="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Send tips instantly without Phantom approval
          </li>
          <li class="flex items-start">
            <svg class="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            Faster transaction processing
          </li>
          <li class="flex items-start">
            <svg class="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            No popup interruptions
          </li>
        </ul>
      </div>

      <!-- Deposit Section -->
      <div class="mb-6">
        <h3 class="text-sm font-medium text-white mb-3">Deposit SOL</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">
              Amount to Deposit (SOL)
            </label>
            <div class="relative">
              <input
                v-model="depositAmount"
                type="number"
                step="0.001"
                min="0.001"
                max="100"
                placeholder="0.01"
                class="input-field w-full pl-8 pr-4"
                :class="{ 'border-red-500': depositError }"
              />
              <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
                <svg class="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
              </div>
            </div>
            <p v-if="depositError" class="text-red-400 text-sm mt-1">{{ depositError }}</p>
            <p class="text-dark-400 text-xs mt-1">
              Min: 0.001 SOL • Max: 100 SOL
            </p>
          </div>

          <button
            @click="depositToPlatformWallet"
            :disabled="!canDeposit || isDepositing"
            class="btn-primary w-full"
            :class="(!canDeposit || isDepositing) ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <span v-if="isDepositing" class="flex items-center justify-center">
              <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Depositing...
            </span>
            <span v-else>Deposit to Platform Wallet</span>
          </button>
        </div>
      </div>

      <!-- Withdraw Section -->
      <div v-if="platformBalance > 0" class="mb-6">
        <h3 class="text-sm font-medium text-white mb-3">Withdraw to Connected Wallet</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-dark-300 mb-1">Amount (SOL)</label>
            <input
              v-model="withdrawAmount"
              type="number"
              step="0.001"
              min="0.001"
              :max="platformBalance"
              placeholder="0.001"
              class="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div class="flex items-center justify-between text-xs text-dark-400">
            <span>Available: {{ platformBalance.toFixed(6) }} SOL</span>
            <button @click="withdrawAmount = platformBalance" class="text-primary-400 hover:text-primary-300">
              Max
            </button>
          </div>
          <button
            @click="handleWithdraw"
            :disabled="!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > platformBalance || isWithdrawing"
            class="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-dark-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            <span v-if="isWithdrawing" class="flex items-center justify-center">
              <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Withdrawing...
            </span>
            <span v-else>Withdraw to Connected Wallet</span>
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
        {{ errorMessage }}
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
        {{ successMessage }}
      </div>

      <!-- Action Buttons -->
      <div class="flex space-x-3">
        <button
          @click="closeModal"
          class="btn-secondary flex-1"
          :disabled="isDepositing"
        >
          Close
        </button>
        <button
          @click="refreshBalance"
          :disabled="isDepositing"
          class="btn-primary flex-1"
        >
          Refresh Balance
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { platformWalletService } from '@src/lib/platform-wallet';

interface Props {
  isOpen: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['close', 'balance-updated']);

const { wallet } = useWallet();

  const depositAmount = ref('');
  const isDepositing = ref(false);
  const withdrawAmount = ref('');
  const isWithdrawing = ref(false);
  const errorMessage = ref('');
  const successMessage = ref('');
const platformBalance = ref(0);
const platformWalletAddress = ref('');

// Validation
const depositError = computed(() => {
  if (!depositAmount.value) return '';
  const amount = parseFloat(depositAmount.value);
  if (isNaN(amount)) return 'Please enter a valid number';
  if (amount < 0.001) return 'Minimum deposit is 0.001 SOL';
  if (amount > 100) return 'Maximum deposit is 100 SOL';
  return '';
});

const canDeposit = computed(() => {
  return depositAmount.value && !depositError.value && wallet.value?.publicKey;
});

// Load platform wallet data when modal opens
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && wallet.value?.publicKey) {
    await loadPlatformWalletData();
  }
});

const loadPlatformWalletData = async () => {
  if (!wallet.value?.publicKey) return;
  
  try {
    const userAddress = wallet.value.publicKey.toBase58();
    platformWalletAddress.value = platformWalletService.getPlatformWalletAddress(userAddress);
    platformBalance.value = await platformWalletService.getBalance(userAddress);
  } catch (error) {
    console.error('Error loading platform wallet data:', error);
    errorMessage.value = 'Failed to load platform wallet data';
  }
};

const copyAddress = async () => {
  try {
    await navigator.clipboard.writeText(platformWalletAddress.value);
    successMessage.value = 'Address copied to clipboard!';
    setTimeout(() => successMessage.value = '', 3000);
  } catch (error) {
    errorMessage.value = 'Failed to copy address';
  }
};

const depositToPlatformWallet = async () => {
  if (!canDeposit.value || !wallet.value?.publicKey) return;

  isDepositing.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const amount = parseFloat(depositAmount.value);
    
    // Import the deposit function (we'll create this)
    const { depositToPlatformWallet } = await import('@src/lib/x402-platform-client');
    
    const result = await depositToPlatformWallet(
      wallet.value,
      platformWalletAddress.value,
      amount
    );

    if (result.success) {
      successMessage.value = `Successfully deposited ${amount} SOL to platform wallet!`;
      depositAmount.value = '';
      await loadPlatformWalletData();
      emit('balance-updated');
    } else {
      errorMessage.value = result.message || 'Failed to deposit SOL';
    }
  } catch (error: any) {
    console.error('Deposit error:', error);
    
    if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
      errorMessage.value = 'Transaction was cancelled by user';
    } else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient')) {
      errorMessage.value = 'Insufficient SOL balance. Please add funds to your wallet.';
    } else {
      errorMessage.value = 'Failed to deposit SOL. Please try again.';
    }
  } finally {
    isDepositing.value = false;
  }
};

const handleWithdraw = async () => {
  if (!withdrawAmount.value || parseFloat(withdrawAmount.value) <= 0) return;
  
  isWithdrawing.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  
  try {
    const amount = parseFloat(withdrawAmount.value);
    const userAddress = wallet.value?.publicKey?.toBase58();
    
    if (!userAddress) {
      throw new Error('Wallet not connected');
    }
    
    // Call withdraw API
    const response = await fetch('/api/platform-withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user: userAddress,
        amount: amount
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      successMessage.value = `Successfully withdrew ${amount} SOL to your connected wallet!`;
      withdrawAmount.value = '';
      await refreshBalance();
      emit('balance-updated');
    } else {
      errorMessage.value = result.message || 'Withdraw failed';
    }
  } catch (error: any) {
    console.error('Withdraw error:', error);
    errorMessage.value = error.message || 'Withdraw failed';
  } finally {
    isWithdrawing.value = false;
  }
};

const refreshBalance = async () => {
  await loadPlatformWalletData();
};

const closeModal = () => {
  emit('close');
};
</script>
