<template>
  <div class="min-h-screen bg-dark-900 text-dark-100">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-white mb-4">
          <span class="text-primary-500">x402</span> Payment Proof
        </h1>
        <p class="text-xl text-dark-300 max-w-3xl mx-auto">
          Trench Beacon uses the <strong>x402 Payment Required</strong> protocol for transparent, on-chain payments.
          Every beacon requires a verifiable 0.001 SOL payment to our public treasury.
        </p>
      </div>

      <!-- Treasury Address Section -->
      <div class="card mb-8">
        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          Treasury Wallet
        </h2>
        <div class="bg-dark-800 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-dark-400 mb-1">Solana Address (SOL)</p>
              <p class="text-lg font-mono text-white break-all">{{ treasuryAddress }}</p>
            </div>
            <div class="flex space-x-2">
              <button
                @click="copyTreasuryAddress"
                class="btn-secondary text-sm px-3 py-2"
                :disabled="copying"
              >
                {{ copying ? 'Copied!' : 'Copy' }}
              </button>
              <a
                :href="`https://solscan.io/account/${treasuryAddress}`"
                target="_blank"
                class="btn-primary text-sm px-3 py-2"
              >
                View on Solscan
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Live Payment Feed -->
      <div class="card mb-8">
        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          Live Payment Feed
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-dark-700">
                <th class="text-left py-3 px-4 text-dark-300">Transaction</th>
                <th class="text-left py-3 px-4 text-dark-300">Wallet</th>
                <th class="text-left py-3 px-4 text-dark-300">Amount</th>
                <th class="text-left py-3 px-4 text-dark-300">Timestamp</th>
                <th class="text-left py-3 px-4 text-dark-300">Beacon</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loadingPayments" class="border-b border-dark-700">
                <td colspan="5" class="py-8 text-center text-dark-400">
                  <div class="flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading payments...
                  </div>
                </td>
              </tr>
              <tr v-else-if="payments.length === 0" class="border-b border-dark-700">
                <td colspan="5" class="py-8 text-center text-dark-400">
                  No payments found
                </td>
              </tr>
              <tr v-else v-for="payment in payments" :key="payment.id" class="border-b border-dark-700 hover:bg-dark-800">
                <td class="py-3 px-4">
                  <a
                    :href="`https://solscan.io/tx/${payment.treasury_transaction}`"
                    target="_blank"
                    class="text-primary-400 hover:text-primary-300 font-mono text-sm"
                  >
                    {{ payment.treasury_transaction.slice(0, 8) }}...{{ payment.treasury_transaction.slice(-8) }}
                  </a>
                </td>
                <td class="py-3 px-4">
                  <span class="font-mono text-sm">{{ payment.author.slice(0, 8) }}...{{ payment.author.slice(-8) }}</span>
                </td>
                <td class="py-3 px-4">
                  <span class="text-green-400 font-semibold">0.001 SOL</span>
                </td>
                <td class="py-3 px-4 text-sm text-dark-300">
                  {{ formatTimestamp(payment.timestamp) }}
                </td>
                <td class="py-3 px-4">
                  <span class="text-sm text-dark-300">{{ payment.content.slice(0, 30) }}{{ payment.content.length > 30 ? '...' : '' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Transaction Verifier -->
      <div class="card mb-8">
        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          Transaction Verifier
        </h2>
        <div class="bg-dark-800 rounded-lg p-6">
          <p class="text-dark-300 mb-4">
            Verify that a transaction was a valid x402 payment to our treasury.
          </p>
          <div class="flex space-x-4">
            <input
              v-model="verificationTx"
              type="text"
              placeholder="Enter transaction signature..."
              class="input-field flex-1"
            />
            <button
              @click="verifyTransaction"
              :disabled="!verificationTx || verifying"
              class="btn-primary px-6"
            >
              {{ verifying ? 'Verifying...' : 'Verify' }}
            </button>
          </div>
          <div v-if="verificationResult" class="mt-4 p-4 rounded-lg" :class="verificationResult.valid ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'">
            <div class="flex items-center">
              <svg v-if="verificationResult.valid" class="w-5 h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg v-else class="w-5 h-5 mr-2 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
              <span :class="verificationResult.valid ? 'text-green-400' : 'text-red-400'">
                {{ verificationResult.valid ? '✅ Valid x402 Payment' : '❌ Invalid Payment' }}
              </span>
            </div>
            <p v-if="verificationResult.message" class="text-sm mt-2 text-dark-300">
              {{ verificationResult.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- cURL Example -->
      <div class="card mb-8">
        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
          </svg>
          x402 Protocol Flow
        </h2>
        <div class="bg-dark-800 rounded-lg p-6">
          <p class="text-dark-300 mb-4">
            Here's exactly how the x402 Payment Required protocol works:
          </p>
          
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-white mb-2">Step 1: Request Beacon (No Payment)</h3>
              <div class="bg-black rounded-lg p-4 overflow-x-auto">
                <pre class="text-green-400 text-sm"><code>curl -i -X POST https://trenchbeacon.com/api/beacon \
  -H "Content-Type: application/json" \
  -d '{"topic":"test","content":"hello world","author":"demo"}'</code></pre>
              </div>
              <p class="text-sm text-dark-400 mt-2">Server responds with HTTP 402 Payment Required</p>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-white mb-2">Step 2: Pay 0.001 SOL to Treasury</h3>
              <div class="bg-black rounded-lg p-4 overflow-x-auto">
                <pre class="text-blue-400 text-sm"><code># User pays 0.001 SOL to: {{ treasuryAddress }}
# Transaction signature: 3DwerjP7...</code></pre>
              </div>
              <p class="text-sm text-dark-400 mt-2">Payment must be exactly 0.001 SOL to our treasury address</p>
            </div>

            <div>
              <h3 class="text-lg font-semibold text-white mb-2">Step 3: Retry with Payment Proof</h3>
              <div class="bg-black rounded-lg p-4 overflow-x-auto">
                <pre class="text-yellow-400 text-sm"><code>curl -i -X POST https://trenchbeacon.com/api/beacon \
  -H "Content-Type: application/json" \
  -H "x-402-proof: {\"transaction\":\"3DwerjP7...\",\"amount\":0.001,\"network\":\"solana\"}" \
  -d '{"topic":"test","content":"hello world","author":"demo"}'</code></pre>
              </div>
              <p class="text-sm text-dark-400 mt-2">Server verifies payment and creates beacon</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center text-dark-400">
        <p class="mb-2">
          Learn more about the <a href="https://github.com/coinbase/x402" target="_blank" class="text-primary-400 hover:text-primary-300">x402 protocol</a> (Coinbase open standard)
        </p>
        <p class="text-sm">
          x402 enables programmatic on-chain payments via HTTP 402 status
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { TREASURY_SOL_ADDRESS } from '@src/lib/x402';

const treasuryAddress = TREASURY_SOL_ADDRESS;
const payments = ref<any[]>([]);
const loadingPayments = ref(false);
const copying = ref(false);
const verificationTx = ref('');
const verificationResult = ref<any>(null);
const verifying = ref(false);

// Load payments on mount
onMounted(async () => {
  await loadPayments();
});

// Load recent payments
const loadPayments = async () => {
  loadingPayments.value = true;
  try {
    const response = await fetch('/api/payments');
    if (response.ok) {
      const data = await response.json();
      payments.value = data.payments || [];
    }
  } catch (error) {
    console.error('Failed to load payments:', error);
  } finally {
    loadingPayments.value = false;
  }
};

// Copy treasury address
const copyTreasuryAddress = async () => {
  try {
    await navigator.clipboard.writeText(treasuryAddress);
    copying.value = true;
    setTimeout(() => {
      copying.value = false;
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
};

// Verify transaction
const verifyTransaction = async () => {
  if (!verificationTx.value) return;
  
  verifying.value = true;
  try {
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transaction: verificationTx.value }),
    });
    
    const result = await response.json();
    verificationResult.value = result;
  } catch (error) {
    verificationResult.value = {
      valid: false,
      message: 'Verification failed. Please try again.'
    };
  } finally {
    verifying.value = false;
  }
};

// Format timestamp
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }) + ' UTC';
};
</script>
