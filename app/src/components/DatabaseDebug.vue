<template>
  <div v-if="isAdmin" class="fixed bottom-4 right-4 bg-dark-900 border border-dark-700 rounded-lg p-4 max-w-md z-50">
    <h3 class="text-white font-semibold mb-2">Database Debug</h3>
    <div class="space-y-2 text-sm">
      <div class="text-dark-300">
        <strong>Environment:</strong> {{ environment }}
      </div>
      <div class="text-dark-300">
        <strong>Connection:</strong> 
        <span :class="connectionStatus === 'success' ? 'text-green-400' : 'text-red-400'">
          {{ connectionStatus }}
        </span>
      </div>
      <div class="text-dark-300">
        <strong>Beacons Count:</strong> {{ beaconCount }}
      </div>
      <div class="text-dark-300">
        <strong>Error:</strong> 
        <span class="text-red-400">{{ error || 'None' }}</span>
      </div>
    </div>
    <button 
      @click="testConnection"
      class="mt-3 px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white text-xs rounded transition-colors"
    >
      Test Connection
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@src/lib/supabase';
import { useWorkspace } from '@src/hooks';

const { wallet } = useWorkspace();

// Admin wallet address
const ADMIN_WALLET = 'J3Auwtoj7RiPEkicM3tLhEsKcghXoMhV9utMYV6yKGVM';

// Only show debug panel for admin
const isAdmin = computed(() => {
  return wallet.value?.publicKey?.toBase58() === ADMIN_WALLET;
});

const environment = ref(process.env.NODE_ENV);
const connectionStatus = ref('unknown');
const beaconCount = ref(0);
const error = ref('');

const testConnection = async () => {
  try {
    console.log('🧪 Testing database connection...');
    connectionStatus.value = 'testing';
    error.value = '';
    
    // Test basic connection
    const { data, error: queryError } = await supabase
      .from('beacons')
      .select('count', { count: 'exact', head: true });
    
    if (queryError) {
      console.error('❌ Database test failed:', queryError);
      connectionStatus.value = 'failed';
      error.value = queryError.message;
    } else {
      console.log('✅ Database test successful');
      connectionStatus.value = 'success';
      beaconCount.value = data?.length || 0;
    }
  } catch (err: any) {
    console.error('❌ Database test error:', err);
    connectionStatus.value = 'failed';
    error.value = err.message;
  }
};

onMounted(() => {
  testConnection();
});
</script>
