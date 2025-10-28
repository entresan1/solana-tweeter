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
  // Define interaction type
  interface InteractionData {
    id: number;
    interactionType: 'liked' | 'replied' | 'tipped';
    interactionTimestamp: string;
    content?: string;
    amount?: number;
    message?: string;
    beacon?: {
      id: number;
      author: string;
      author_display: string;
      content: string;
      topic: string;
      created_at: string;
    };
  }

  const interactedTweets = ref<InteractionData[]>([]);
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

      console.log('🔄 Loading interactions for wallet:', walletAddress);
      
      // Load actual interactions (likes, replies, tips) from the database
      const interactions = await fetchUserInteractions(walletAddress);
      console.log('🔄 Found interactions:', interactions.length);
      
      interactedTweets.value = interactions;
    } catch (error) {
      console.error('Error loading interacted tweets:', error);
      interactedTweets.value = [];
    }
  };

  // Fetch user interactions from the database
  const fetchUserInteractions = async (walletAddress: string) => {
    try {
      // Fetch liked beacons
      const likesResponse = await fetch(`/api/user-interactions?walletAddress=${encodeURIComponent(walletAddress)}&type=likes`);
      const likesData = await likesResponse.json();
      
      // Fetch replied beacons
      const repliesResponse = await fetch(`/api/user-interactions?walletAddress=${encodeURIComponent(walletAddress)}&type=replies`);
      const repliesData = await repliesResponse.json();
      
      // Fetch tipped beacons
      const tipsResponse = await fetch(`/api/user-interactions?walletAddress=${encodeURIComponent(walletAddress)}&type=tips`);
      const tipsData = await tipsResponse.json();
      
      // Combine all interactions and sort by timestamp
      const allInteractions = [
        ...(likesData.interactions || []).map((interaction: any) => ({
          ...interaction,
          interactionType: 'liked',
          interactionTimestamp: interaction.liked_at || interaction.created_at
        })),
        ...(repliesData.interactions || []).map((interaction: any) => ({
          ...interaction,
          interactionType: 'replied',
          interactionTimestamp: interaction.replied_at || interaction.created_at
        })),
        ...(tipsData.interactions || []).map((interaction: any) => ({
          ...interaction,
          interactionType: 'tipped',
          interactionTimestamp: interaction.tipped_at || interaction.created_at
        }))
      ];
      
      // Sort by interaction timestamp (most recent first)
      allInteractions.sort((a, b) => new Date(b.interactionTimestamp).getTime() - new Date(a.interactionTimestamp).getTime());
      
      console.log('🔄 Combined interactions:', allInteractions.length);
      return allInteractions;
    } catch (error) {
      console.error('Error fetching user interactions:', error);
      return [];
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
        <div class="relative group">
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
          <!-- Camera overlay for editing mode -->
          <div v-if="isOwnProfile && editing" class="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200">
            <label class="cursor-pointer bg-primary-500 hover:bg-primary-600 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 shadow-lg">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input type="file" accept="image/*" @change="handleImageUpload" class="hidden" />
            </label>
          </div>
          
          <!-- Hover indicator for non-editing mode -->
          <div v-else-if="isOwnProfile" class="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div class="bg-white/20 text-white p-2 rounded-full">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
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
        <div v-else class="space-y-4">
          <div 
            v-for="interaction in interactedTweets" 
            :key="`${interaction.interactionType}-${interaction.id}`"
            class="bg-dark-800 rounded-lg p-4 border border-dark-700"
          >
            <!-- Interaction Header -->
            <div class="flex items-center space-x-2 mb-3">
              <div class="flex items-center space-x-2">
                <div v-if="interaction.interactionType === 'liked'" class="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                  <svg class="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div v-else-if="interaction.interactionType === 'replied'" class="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div v-else-if="interaction.interactionType === 'tipped'" class="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <span class="text-sm font-medium text-white">
                You {{ interaction.interactionType }} this beacon
              </span>
              <span class="text-xs text-dark-400">
                {{ new Date(interaction.interactionTimestamp).toLocaleDateString() }}
              </span>
            </div>
            
            <!-- Beacon Content -->
            <div v-if="interaction.beacon" class="bg-dark-900/50 rounded-lg p-3">
              <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-gradient-to-r from-primary-500 to-solana-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span class="text-white text-xs font-bold">
                    {{ interaction.beacon.author_display?.charAt(0) || 'U' }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="text-sm font-medium text-white">
                      {{ interaction.beacon.author_display || 'Unknown User' }}
                    </span>
                    <span class="text-xs text-dark-400">•</span>
                    <span class="text-xs text-dark-400">
                      {{ new Date(interaction.beacon.created_at).toLocaleDateString() }}
                    </span>
                  </div>
                  <p class="text-sm text-dark-200 mb-2">{{ interaction.beacon.content }}</p>
                  <div v-if="interaction.beacon.topic" class="text-xs">
                    <span class="inline-flex items-center px-2 py-1 rounded-full bg-primary-500/20 text-primary-400">
                      #{{ interaction.beacon.topic }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Interaction Details -->
            <div v-if="interaction.content || interaction.amount" class="mt-3 text-sm text-dark-300">
              <div v-if="interaction.content">
                <span class="font-medium">Your reply:</span> {{ interaction.content }}
              </div>
              <div v-if="interaction.amount">
                <span class="font-medium">Tip amount:</span> {{ interaction.amount }} SOL
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>