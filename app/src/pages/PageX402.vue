<template>
  <div class="min-h-screen bg-dark-900 text-dark-100">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-white mb-4">
          <span class="text-primary-500">x402</span> Protocol
        </h1>
        <p class="text-xl text-dark-300 max-w-4xl mx-auto">
          Trench Beacon uses the <strong>x402 Payment Required</strong> protocol for transparent, on-chain payments.
          Every beacon requires a verifiable 0.001 SOL payment to our public treasury, and users can tip each other with custom SOL amounts.
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

      <!-- How x402 Works -->
      <div class="card mb-8">
        <h2 class="text-2xl font-semibold text-white mb-4 flex items-center">
          <svg class="w-6 h-6 mr-2 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          How x402 Works
        </h2>
        <div class="bg-dark-800 rounded-lg p-6">
          <div class="grid md:grid-cols-2 gap-8">
            <!-- Beacon Payments -->
            <div>
              <h3 class="text-lg font-semibold text-white mb-3 flex items-center">
                <span class="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs font-bold mr-2">1</span>
                Beacon Payments (0.001 SOL)
              </h3>
              <ul class="space-y-2 text-dark-300">
                <li class="flex items-start">
                  <span class="text-primary-400 mr-2">•</span>
                  <span>Every beacon requires a 0.001 SOL payment to our treasury</span>
                </li>
                <li class="flex items-start">
                  <span class="text-primary-400 mr-2">•</span>
                  <span>Payment is verified on-chain before beacon is published</span>
                </li>
                <li class="flex items-start">
                  <span class="text-primary-400 mr-2">•</span>
                  <span>Prevents spam and ensures quality content</span>
                </li>
                <li class="flex items-start">
                  <span class="text-primary-400 mr-2">•</span>
                  <span>All payments are transparent and verifiable</span>
                </li>
              </ul>
            </div>

            <!-- User Tips -->
            <div>
              <h3 class="text-lg font-semibold text-white mb-3 flex items-center">
                <span class="w-6 h-6 bg-solana-500 rounded-full flex items-center justify-center text-xs font-bold mr-2">2</span>
                User Tips (Custom Amounts)
              </h3>
              <ul class="space-y-2 text-dark-300">
                <li class="flex items-start">
                  <span class="text-solana-400 mr-2">•</span>
                  <span>Users can tip any amount (0.001 - 10 SOL)</span>
                </li>
                <li class="flex items-start">
                  <span class="text-solana-400 mr-2">•</span>
                  <span>Tips go directly to the beacon author</span>
                </li>
                <li class="flex items-start">
                  <span class="text-solana-400 mr-2">•</span>
                  <span>Each tip requires its own x402 payment</span>
                </li>
                <li class="flex items-start">
                  <span class="text-solana-400 mr-2">•</span>
                  <span>Supports both Phantom wallet and platform wallet</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Platform Wallet Benefits -->
          <div class="mt-6 p-4 bg-gradient-to-r from-primary-500/10 to-solana-500/10 border border-primary-500/20 rounded-lg">
            <h4 class="text-lg font-semibold text-white mb-2 flex items-center">
              <svg class="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              Platform Wallet Benefits
            </h4>
            <p class="text-dark-300 text-sm">
              Deposit SOL into your platform wallet to send beacons and tips without Phantom wallet approval for each transaction. 
              Perfect for frequent users who want seamless interactions.
            </p>
          </div>
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
const recentTips = ref<any[]>([]);
const loadingTips = ref(false);
const copying = ref(false);
const verificationTx = ref('');
const verificationResult = ref<any>(null);
const verifying = ref(false);

// Load data on mount
onMounted(async () => {
  await Promise.all([
    loadPayments(),
    loadLivePayments()
  ]);
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

// Load live payment feed (last 10)
const loadLivePayments = async () => {
  loadingTips.value = true;
  try {
    const response = await fetch('/api/recent-tips?limit=10');
    if (response.ok) {
      const data = await response.json();
      recentTips.value = data.tips || [];
    }
  } catch (error) {
    console.error('Failed to load live payments:', error);
  } finally {
    loadingTips.value = false;
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
