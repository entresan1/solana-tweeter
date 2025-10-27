import { watch } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { profileService } from '@src/lib/supabase';

/**
 * Composable to automatically create user profiles when wallet connects
 */
export function useProfileAutoCreate() {
  const { connected, publicKey } = useWallet();

  // Watch for wallet connection changes
  watch([connected, publicKey], async ([isConnected, walletKey]) => {
    if (isConnected && walletKey) {
      try {
        console.log('🔗 Wallet connected, checking for profile...');
        
        // Check if profile already exists
        const existingProfile = await profileService.getProfile(walletKey.toBase58());
        
        if (!existingProfile) {
          console.log('👤 No profile found, creating new profile...');
          
          // Create new profile
          const newProfile = await profileService.upsertProfile({
            wallet_address: walletKey.toBase58(),
            nickname: walletKey.toBase58().slice(0, 8) + '...',
            bio: 'New beacon user',
          });
          
          console.log('✅ Profile created successfully:', newProfile);
        } else {
          console.log('👤 Profile already exists:', existingProfile);
        }
      } catch (error) {
        console.error('❌ Error creating profile:', error);
        // Don't throw - this shouldn't break the app
      }
    }
  }, { immediate: true });
}
