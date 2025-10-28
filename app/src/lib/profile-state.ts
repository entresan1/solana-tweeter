import { ref, computed } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { profileService, UserProfile } from './supabase';

// Global profile state
const currentUserProfile = ref<UserProfile | null>(null);
const isLoadingProfile = ref(false);

// Profile state management
export const profileState = {
  // Current user profile data
  currentUserProfile: computed(() => currentUserProfile.value),
  isLoadingProfile: computed(() => isLoadingProfile.value),
  
  // Load profile for connected wallet
  async loadCurrentUserProfile() {
    const { wallet } = useWallet();
    
    if (!wallet.value?.publicKey) {
      currentUserProfile.value = null;
      return;
    }
    
    isLoadingProfile.value = true;
    
    try {
      const userAddress = wallet.value.publicKey.toBase58();
      console.log('👤 Loading current user profile for:', userAddress);
      
      const profile = await profileService.getProfile(userAddress);
      
      if (profile) {
        currentUserProfile.value = profile;
        console.log('✅ Current user profile loaded:', profile);
      } else {
        // Create default profile if none exists
        const defaultProfile = {
          wallet_address: userAddress,
          nickname: userAddress.slice(0, 8) + '...',
          bio: 'New beacon user',
          profile_picture_url: ''
        };
        
        currentUserProfile.value = defaultProfile;
        console.log('📝 Using default profile for current user:', defaultProfile);
      }
    } catch (error) {
      console.error('❌ Error loading current user profile:', error);
      currentUserProfile.value = null;
    } finally {
      isLoadingProfile.value = false;
    }
  },
  
  // Update profile data
  updateProfile(profileData: UserProfile) {
    currentUserProfile.value = profileData;
  },
  
  // Clear profile data
  clearProfile() {
    currentUserProfile.value = null;
  },
  
  // Get profile picture URL
  getProfilePictureUrl(): string {
    if (!currentUserProfile.value?.profile_picture_url) {
      return '';
    }
    return currentUserProfile.value.profile_picture_url;
  },
  
  // Get display name
  getDisplayName(): string {
    if (!currentUserProfile.value) {
      return '';
    }
    return currentUserProfile.value.nickname || currentUserProfile.value.wallet_address?.slice(0, 8) + '...' || 'User';
  },
  
  // Check if profile picture should be displayed
  shouldShowProfilePicture(): boolean {
    return !!(currentUserProfile.value?.profile_picture_url);
  }
};

// Auto-load profile when wallet connects
if (typeof window !== 'undefined') {
  const { wallet } = useWallet();
  
  // Watch for wallet changes and load profile
  import('vue').then(({ watch }) => {
    watch(wallet, async (newWallet) => {
      if (newWallet?.publicKey) {
        await profileState.loadCurrentUserProfile();
      } else {
        profileState.clearProfile();
      }
    });
  });
}
