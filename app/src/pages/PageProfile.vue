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

  const isOwnProfile = computed(() => {
    return wallet.value?.publicKey?.toBase58() === profile.value?.wallet_address;
  });

  const safeProfilePictureUrl = computed(() => {
    return getSafeImageUrl(profilePictureUrl.value);
  });

  const shouldShowProfilePicture = computed(() => {
    return shouldDisplayImage(profilePictureUrl.value);
  });

  onMounted(async () => {
    if (wallet.value?.publicKey) {
      await loadProfile();
      await loadUserTweets();
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

    <!-- User's Beacons -->
    <div class="card">
      <h2 class="text-xl font-semibold text-white mb-4">Beacons</h2>
      <TweetList :tweets="userTweets" :loading="loading" />
    </div>
  </div>
</template>