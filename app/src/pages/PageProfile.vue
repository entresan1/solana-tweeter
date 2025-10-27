<script setup lang="ts">
  import { ref, onMounted, computed } from 'vue';
  import { useWorkspace } from '@src/hooks/useWorkspace';
  import { profileService, UserProfile } from '@src/lib/supabase';
  import { fetchTweets, authorFilter } from '@src/api';
  import TweetList from '@src/components/TweetList.vue';
  import { TweetModel } from '@src/models/tweet.model';
  import { getSafeImageUrl, shouldDisplayImage } from '@src/lib/image-utils';

  const { wallet } = useWorkspace();
  const profile = ref<UserProfile | null>(null);
  const loading = ref(true);
  const editing = ref(false);
  const nickname = ref('');
  const bio = ref('');
  const profilePictureUrl = ref('');
  const userTweets = ref<TweetModel[]>([]);
  const interactedTweets = ref<TweetModel[]>([]);
  const activeTab = ref('posts'); // 'posts' or 'interactions'

  const isOwnProfile = computed(() => {
    return wallet.value?.publicKey?.toBase58() === profile.value?.wallet_address;
  });

  const safeProfilePictureUrl = computed(() => {
    return getSafeImageUrl(profilePictureUrl.value);
  });

  const shouldShowProfilePicture = computed(() => {
    return shouldDisplayImage(profilePictureUrl.value);
  });

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

  // Generate default avatar for the current user
  const defaultAvatar = computed(() => {
    if (wallet.value?.publicKey) {
      return generateRandomAvatar(wallet.value.publicKey.toBase58());
    }
    return '';
  });

  onMounted(async () => {
    if (wallet.value?.publicKey) {
      await loadProfile();
      await loadUserTweets();
      await loadInteractedTweets();
    }
    loading.value = false;
  });

  const loadProfile = async () => {
    try {
      const walletAddress = wallet.value?.publicKey?.toBase58();
      if (!walletAddress) return;

      const userProfile = await profileService.getProfile(walletAddress);
      if (userProfile) {
        profile.value = userProfile;
        nickname.value = userProfile.nickname || '';
        bio.value = userProfile.bio || '';
        profilePictureUrl.value = userProfile.profile_picture_url || '';
      } else {
        // Create default profile
        profile.value = {
          wallet_address: walletAddress,
          nickname: '',
          bio: '',
          profile_picture_url: ''
        };
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserTweets = async () => {
    try {
      const walletAddress = wallet.value?.publicKey?.toBase58();
      if (!walletAddress) return;

      const tweets = await authorFilter(walletAddress);
      userTweets.value = tweets;
    } catch (error) {
      console.error('Error loading user tweets:', error);
    }
  };

  const loadInteractedTweets = async () => {
    try {
      const walletAddress = wallet.value?.publicKey?.toBase58();
      if (!walletAddress) return;

      // For now, we'll load all tweets and filter for interactions
      // In a real implementation, you'd have specific API endpoints for this
      const allTweets = await fetchTweets();
      
      // Filter tweets that the user has interacted with
      // This is a simplified version - in reality you'd check likes, replies, tips
      const interacted = allTweets.filter(tweet => {
        // For now, just show recent tweets as "interacted"
        // In a real app, you'd check actual interaction data
        return tweet.author.toBase58() !== walletAddress;
      }).slice(0, 10); // Limit to 10 most recent

      interactedTweets.value = interacted;
    } catch (error) {
      console.error('Error loading interacted tweets:', error);
    }
  };

  const startEditing = () => {
    editing.value = true;
  };

  const cancelEditing = () => {
    editing.value = false;
    // Reset to original values
    nickname.value = profile.value?.nickname || '';
    bio.value = profile.value?.bio || '';
    profilePictureUrl.value = profile.value?.profile_picture_url || '';
  };

  const saveProfile = async () => {
    try {
      if (!wallet.value?.publicKey) return;

      const updatedProfile = await profileService.upsertProfile({
        wallet_address: wallet.value.publicKey.toBase58(),
        nickname: nickname.value,
        bio: bio.value,
        profile_picture_url: profilePictureUrl.value
      });

      profile.value = updatedProfile;
      editing.value = false;
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleImageUpload = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      // For now, we'll use a placeholder. In production, you'd upload to a service like Cloudinary
      const reader = new FileReader();
      reader.onload = (e) => {
        profilePictureUrl.value = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };
</script>

<template>
  <div class="max-w-4xl mx-auto p-6">
    <!-- Profile Header -->
    <div class="card mb-6">
      <div class="flex items-start space-x-6">
        <!-- Profile Picture -->
        <div class="relative">
          <div class="w-24 h-24 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center overflow-hidden">
            <img 
              v-if="shouldShowProfilePicture" 
              :src="safeProfilePictureUrl" 
              :alt="nickname || 'Profile'"
              class="w-full h-full object-cover"
            />
            <img 
              v-else-if="defaultAvatar"
              :src="defaultAvatar" 
              :alt="nickname || 'Profile'"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-white font-bold text-2xl">
              {{ (nickname || wallet?.publicKey?.toBase58() || 'U').charAt(0).toUpperCase() }}
            </span>
          </div>
          <div v-if="isOwnProfile && editing" class="absolute -bottom-2 -right-2">
            <label class="cursor-pointer bg-primary-500 hover:bg-primary-600 text-white p-2 rounded-full transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" @change="handleImageUpload" class="hidden" />
            </label>
          </div>
        </div>

        <!-- Profile Info -->
        <div class="flex-1">
          <div v-if="!editing">
            <h1 class="text-2xl font-bold text-white mb-2">
              {{ nickname || wallet?.publicKey?.toBase58()?.slice(0, 8) + '...' || 'Anonymous' }}
            </h1>
            <p v-if="bio" class="text-dark-300 mb-4">{{ bio }}</p>
            <p class="text-dark-400 text-sm mb-4">
              {{ wallet?.publicKey?.toBase58() }}
            </p>
            <div class="flex items-center space-x-4">
              <span class="text-dark-400">
                <strong class="text-white">{{ userTweets.length }}</strong> beacons
              </span>
              <button 
                v-if="isOwnProfile"
                @click="startEditing"
                class="btn-primary text-sm px-4 py-2"
              >
                Edit Profile
              </button>
            </div>
          </div>

          <!-- Edit Form -->
          <div v-else class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Nickname</label>
              <input
                v-model="nickname"
                type="text"
                placeholder="Enter your nickname"
                class="input-field w-full"
                maxlength="50"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Bio</label>
              <textarea
                v-model="bio"
                placeholder="Tell us about yourself"
                class="input-field w-full h-20 resize-none"
                maxlength="160"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Profile Picture URL</label>
              <input
                v-model="profilePictureUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                class="input-field w-full"
              />
            </div>
            <div class="flex space-x-3">
              <button @click="saveProfile" class="btn-primary px-4 py-2">
                Save Changes
              </button>
              <button @click="cancelEditing" class="btn-secondary px-4 py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- User's Beacons and Interactions -->
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white">Activity</h2>
        
        <!-- Tab Navigation -->
        <div class="flex space-x-1 bg-dark-800 rounded-lg p-1">
          <button
            @click="activeTab = 'posts'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
            :class="activeTab === 'posts' 
              ? 'bg-primary-500 text-white' 
              : 'text-dark-300 hover:text-white hover:bg-dark-700'"
          >
            My Posts ({{ userTweets.length }})
          </button>
          <button
            @click="activeTab = 'interactions'"
            class="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
            :class="activeTab === 'interactions' 
              ? 'bg-primary-500 text-white' 
              : 'text-dark-300 hover:text-white hover:bg-dark-700'"
          >
            Interactions ({{ interactedTweets.length }})
          </button>
        </div>
      </div>
      
      <!-- Tab Content -->
      <div v-if="activeTab === 'posts'">
        <TweetList :tweets="userTweets" :loading="loading" />
      </div>
      <div v-else-if="activeTab === 'interactions'">
        <div v-if="interactedTweets.length === 0" class="text-center py-8 text-dark-400">
          <svg class="w-12 h-12 mx-auto mb-4 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>No interactions yet</p>
          <p class="text-sm mt-2">Like, reply, or tip beacons to see them here</p>
        </div>
        <TweetList v-else :tweets="interactedTweets" :loading="loading" />
      </div>
    </div>
  </div>
</template>