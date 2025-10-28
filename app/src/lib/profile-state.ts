import { ref, computed } from 'vue';
import { useWallet } from 'solana-wallets-vue';
import { profileService, UserProfile } from './supabase';

// Global profile state
const currentUserProfile = ref<UserProfile | null>(null);
const isLoadingProfile = ref(false);

// Generate cool random shapes for default avatars
const generateRandomAvatar = (seed: string) => {
  // Create a simple hash from the seed for consistent colors
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate consistent colors based on hash
  const hue = Math.abs(hash) % 360;
  const saturation = 70 + (Math.abs(hash >> 8) % 30); // 70-100%
  const lightness = 50 + (Math.abs(hash >> 16) % 20); // 50-70%
  
  const primaryColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const secondaryColor = `hsl(${(hue + 60) % 360}, ${saturation}%, ${lightness + 10}%)`;
  const accentColor = `hsl(${(hue + 120) % 360}, ${saturation}%, ${lightness - 10}%)`;
  
  // Choose a random shape type
  const shapeType = Math.abs(hash >> 24) % 6;
  
  let svgContent = '';
  
  switch (shapeType) {
    case 0: // Hexagon
      svgContent = `
        <polygon points="50,10 80,30 80,70 50,90 20,70 20,30" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="2"/>
        <polygon points="50,20 70,35 70,65 50,80 30,65 30,35" fill="${accentColor}" opacity="0.7"/>
      `;
      break;
    case 1: // Diamond with circles
      svgContent = `
        <polygon points="50,10 80,50 50,90 20,50" fill="${primaryColor}"/>
        <circle cx="50" cy="50" r="15" fill="${secondaryColor}"/>
        <circle cx="50" cy="50" r="8" fill="${accentColor}"/>
      `;
      break;
    case 2: // Star
      svgContent = `
        <polygon points="50,5 61,35 95,35 68,57 79,87 50,65 21,87 32,57 5,35 39,35" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="2"/>
        <polygon points="50,15 55,35 75,35 60,50 65,70 50,55 35,70 40,50 25,35 45,35" fill="${accentColor}" opacity="0.8"/>
      `;
      break;
    case 3: // Triangle with gradient
      svgContent = `
        <defs>
          <linearGradient id="grad${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${primaryColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${secondaryColor};stop-opacity:1" />
          </linearGradient>
        </defs>
        <polygon points="50,10 85,80 15,80" fill="url(#grad${hash})"/>
        <polygon points="50,25 70,70 30,70" fill="${accentColor}" opacity="0.6"/>
      `;
      break;
    case 4: // Spiral
      svgContent = `
        <circle cx="50" cy="50" r="40" fill="${primaryColor}"/>
        <circle cx="50" cy="50" r="30" fill="${secondaryColor}"/>
        <circle cx="50" cy="50" r="20" fill="${accentColor}"/>
        <circle cx="50" cy="50" r="10" fill="${primaryColor}"/>
      `;
      break;
    case 5: // Lightning bolt
      svgContent = `
        <polygon points="50,10 70,40 55,40 65,90 45,60 60,60" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="2"/>
        <polygon points="50,20 60,40 55,40 60,70 50,50 55,50" fill="${accentColor}" opacity="0.8"/>
      `;
      break;
  }
  
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="rgba(0,0,0,0.1)" rx="50"/>
      ${svgContent}
    </svg>
  `)}`;
};

// Profile state management
export const profileState = {
  // Current user profile data
  currentUserProfile: computed(() => currentUserProfile.value),
  isLoadingProfile: computed(() => isLoadingProfile.value),
  
  // Load profile for connected wallet
  async loadCurrentUserProfile(wallet?: any) {
    if (!wallet?.publicKey) {
      currentUserProfile.value = null;
      return;
    }
    
    isLoadingProfile.value = true;
    
    try {
      const userAddress = wallet.publicKey.toBase58();
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
  
  // Get profile picture URL - always returns generated avatar
  getProfilePictureUrl(): string {
    if (!currentUserProfile.value?.wallet_address) {
      return '';
    }
    return generateRandomAvatar(currentUserProfile.value.wallet_address);
  },
  
  // Get display name
  getDisplayName(): string {
    return 'Profile';
  },
  
  // Check if profile picture should be displayed - always true for generated avatars
  shouldShowProfilePicture(): boolean {
    return !!(currentUserProfile.value?.wallet_address);
  }
};

// Auto-load profile when wallet connects
// Note: This will be handled by components that call loadCurrentUserProfile()
// when the wallet changes, rather than at module level
