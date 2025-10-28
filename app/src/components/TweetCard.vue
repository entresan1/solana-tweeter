<script setup lang="ts">
import { toRefs, computed, ref, onMounted, watch } from 'vue';
import { TweetModel } from '@src/models/tweet.model';
  import { useWorkspace } from '@src/hooks/useWorkspace';
  import { profileService, interactionService, tipService } from '@src/lib/supabase';
  import { platformWalletService } from '@src/lib/platform-wallet';
  import PlatformWalletModal from './PlatformWalletModal.vue';
  import { getSafeImageUrl, shouldDisplayImage } from '@src/lib/image-utils';
  import { optimizedDataService } from '@src/lib/optimized-data-service';
  import SafeRouterLink from './SafeRouterLink.vue';

  interface IProps {
    tweet: TweetModel;
  }

  const props = defineProps<IProps>();

  const { tweet } = toRefs(props);
  const { wallet } = useWorkspace();
  const authorProfile = ref(null);
  const authorDisplayName = ref('');
  const authorAvatar = ref('');
  const isLiked = ref(false);
  const likeCount = ref(0);
  const isRugged = ref(false);
  const rugCount = ref(0);
  const showReplyModal = ref(false);
  const replyContent = ref('');
  const replies = ref<any[]>([]);
  const showReplies = ref(false);
  
  // CA detection
  const isCA = computed(() => {
    const content = tweet.value?.content?.trim() || '';
    const caMatch = content.match(/\b[1-9A-HJ-NP-Za-km-z]{44}\b/);
    return !!caMatch;
  });
  
  // Extract CA address from content
  const caAddress = computed(() => {
    const content = tweet.value?.content?.trim() || '';
    const caMatch = content.match(/\b[1-9A-HJ-NP-Za-km-z]{44}\b/);
    return caMatch ? caMatch[0] : '';
  });
  
  // CA buying state
  const isBuyingCA = ref(false);
const showBuyCAModal = ref(false);
const buyAmount = ref('0.1');
  const caBuyError = ref('');
  const loadingReplies = ref(false);
  const showTipModal = ref(false);
  const tipAmount = ref('');
  const tipMessage = ref('');
  const isTipping = ref(false);
  const tipErrorMessage = ref('');
  const totalTips = ref(0);
  const tipCount = ref(0);
  const loadingTips = ref(false);
  const showPlatformWalletModal = ref(false);
  const platformBalance = ref(0);
  const usePlatformWallet = ref(false);
  const tipMessages = ref<any[]>([]);
  const showTipMessages = ref(false);
  const loadingTipMessages = ref(false);

  // Computed properties for safe image handling
  const safeAuthorAvatar = computed(() => {
    return getSafeImageUrl(authorAvatar.value);
  });

  const shouldShowAuthorAvatar = computed(() => {
    return shouldDisplayImage(authorAvatar.value);
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

  // Generate default avatar for the current author
  const defaultAvatar = computed(() => {
    if (tweet.value?.author) {
      return generateRandomAvatar(tweet.value.author.toBase58());
    }
    return '';
  });

  // Function to load profile data for the current tweet
  const loadProfileData = async () => {
    if (tweet.value?.author) {
      const authorAddress = tweet.value.author.toBase58();
      console.log('🖼️ Loading profile data for author:', authorAddress);
      
      try {
        const profile = await optimizedDataService.getProfile(authorAddress);
        console.log('🖼️ Profile data received:', profile);
        
        if (profile) {
          authorProfile.value = profile;
          authorDisplayName.value = profile.nickname || authorAddress.slice(0, 8) + '...';
          authorAvatar.value = profile.profile_picture_url || '';
          console.log('🖼️ Profile loaded - Display name:', authorDisplayName.value, 'Avatar:', authorAvatar.value);
        } else {
          // No profile found - use default display name
          authorDisplayName.value = authorAddress.slice(0, 8) + '...';
          authorProfile.value = null;
          authorAvatar.value = '';
          console.log('🖼️ No profile found - using default display name:', authorDisplayName.value);
        }
      } catch (error) {
        // Handle 406 and other errors gracefully
        console.warn('Profile fetch failed (this is normal for new users):', error);
        authorDisplayName.value = authorAddress.slice(0, 8) + '...';
        authorProfile.value = null;
        authorAvatar.value = '';
        console.log('🖼️ Profile fetch failed - using default display name:', authorDisplayName.value);
      }
    } else {
      // Reset profile data if no author
      authorProfile.value = null;
      authorDisplayName.value = '';
      authorAvatar.value = '';
    }
  };

  // Function to load tip data for the current tweet
  const loadTipData = async () => {
    if (tweet.value?.id) {
      loadingTips.value = true;
      try {
        const tipData = await optimizedDataService.getBeaconTips(tweet.value.id);
        totalTips.value = tipData.totalTips;
        tipCount.value = tipData.tipCount;
      } catch (error) {
        console.warn('Failed to load tip data:', error);
        totalTips.value = 0;
        tipCount.value = 0;
      } finally {
        loadingTips.value = false;
      }
    }
  };

  // Function to load tip messages for the current tweet
  const loadTipMessages = async () => {
    if (tweet.value?.id) {
      loadingTipMessages.value = true;
      try {
        const response = await fetch(`/api/beacon-tip-messages?beaconId=${tweet.value.id}`);
        const data = await response.json();
        if (data.success) {
          tipMessages.value = data.messages || [];
        } else {
          console.warn('Failed to load tip messages:', data.message);
          tipMessages.value = [];
        }
      } catch (error) {
        console.warn('Failed to load tip messages:', error);
        tipMessages.value = [];
      } finally {
        loadingTipMessages.value = false;
      }
    }
  };

  // Function to load platform wallet data
  const loadPlatformWalletData = async () => {
    if (wallet.value?.publicKey) {
      try {
        const userAddress = wallet.value.publicKey.toBase58();
        platformBalance.value = await platformWalletService.getBalance(userAddress);
      } catch (error) {
        console.warn('Failed to load platform wallet data:', error);
        platformBalance.value = 0;
      }
    }
  };

  // Watch for tweet changes and reload profile data
  watch(tweet, loadProfileData, { immediate: true });
  watch(tweet, loadTipData, { immediate: true });

  onMounted(async () => {
    console.log('🎯 TweetCard onMounted called');
    console.log('🎯 tweet.value:', tweet.value);
    console.log('🎯 tweet.value?.id:', tweet.value?.id);
    console.log('🎯 tweet.value?.author:', tweet.value?.author);
    
    // Load data in parallel for better performance
    const loadPromises = [
      loadProfileData(), // Add profile data loading
      loadLikeData(),
      loadRugData(),
      loadReplies()
    ];
    
    // Only load platform wallet data if user is connected
    if (wallet.value?.publicKey) {
      loadPromises.push(loadPlatformWalletData());
    }
    
    await Promise.all(loadPromises);
    showReplies.value = true;
  });

  const loadLikeData = async () => {
    console.log('🔍 loadLikeData called');
    console.log('🔍 tweet.value:', tweet.value);
    console.log('🔍 tweet.value?.id:', tweet.value?.id);
    
    if (!tweet.value?.id) {
      console.log('❌ Missing required data - tweet ID');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      console.log('🔍 Loading like data for beacon ID:', beaconId);
      
      // Only get the like count, skip the hasUserLiked check to avoid 406 errors
      console.log('🔍 Calling optimizedDataService.getLikeCount...');
      const count = await optimizedDataService.getLikeCount(beaconId);
      console.log('🔍 getLikeCount result:', count);
      
      // Set liked to false initially (will be updated when user actually likes)
      isLiked.value = false;
      likeCount.value = count;
      console.log('✅ Like data loaded successfully:', { liked: false, count });
    } catch (error: any) {
      console.error('❌ Error loading like data:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      // Set default values on error
      likeCount.value = 0;
      isLiked.value = false;
    }
  };

  const loadRugData = async () => {
    if (!tweet.value?.id) {
      console.log('❌ Missing required data - tweet ID for rug data');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      console.log('🔍 Loading rug data for beacon ID:', beaconId);
      
      const count = await optimizedDataService.getRugCount(beaconId);
      rugCount.value = count;
      isRugged.value = false; // We'll implement user-specific rug status later
      console.log('✅ Rug data loaded successfully:', { count });
    } catch (error: any) {
      console.error('❌ Error loading rug data:', error);
      rugCount.value = 0;
      isRugged.value = false;
    }
  };

  // CA buying function
  // CA buying functions
  const openBuyCAModal = () => {
    showBuyCAModal.value = true;
    buyAmount.value = '0.1';
    caBuyError.value = '';
  };

  const closeBuyCAModal = () => {
    showBuyCAModal.value = false;
    buyAmount.value = '0.1';
    caBuyError.value = '';
  };

  const setQuickAmount = (amount: string) => {
    buyAmount.value = amount;
  };

  const buyCA = async () => {
    if (!wallet.value?.publicKey || !isCA.value) return;
    
    isBuyingCA.value = true;
    caBuyError.value = '';
    
    try {
      const solAmount = parseFloat(buyAmount.value);
      
      if (isNaN(solAmount) || solAmount <= 0) {
        caBuyError.value = 'Please enter a valid SOL amount';
        return;
      }
      
      if (solAmount < 0.01) {
        caBuyError.value = 'Minimum amount is 0.01 SOL';
        return;
      }
      
      const response = await fetch('/api/buy-ca-beacon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          beaconId: tweet.value.id,
          userWallet: wallet.value.publicKey.toBase58(),
          contractAddress: caAddress.value,
          solAmount: solAmount
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to buy CA beacon');
      }
      
      console.log('✅ CA beacon bought successfully:', data);
      closeBuyCAModal();
      // You could emit an event here to refresh the UI
      
    } catch (error: any) {
      console.error('❌ CA buy error:', error);
      caBuyError.value = error.message || 'Failed to buy CA beacon';
    } finally {
      isBuyingCA.value = false;
    }
  };

  const loadReplies = async () => {
    if (!tweet.value?.id) return;
    
    try {
      loadingReplies.value = true;
      console.log('💬 Loading replies for beacon ID:', tweet.value.id);
      
      const beaconReplies = await optimizedDataService.getReplies(tweet.value.id);
      replies.value = beaconReplies;
      console.log('💬 Loaded replies:', beaconReplies);
    } catch (error: any) {
      console.error('❌ Error loading replies:', error);
    } finally {
      loadingReplies.value = false;
    }
  };

  const toggleReplies = async () => {
    if (!showReplies.value) {
      await loadReplies();
    }
    showReplies.value = !showReplies.value;
  };

  const authorRoute = computed(() => {
    if (!tweet.value?.author) {
      console.log('👤 No author, routing to Home');
      return { name: 'Home' };
    }
    
    const authorAddress = tweet.value.author.toBase58();
    console.log('👤 Author address:', authorAddress);
    
    if (
      wallet.value &&
      wallet.value.publicKey.toBase58() === authorAddress
    ) {
      console.log('👤 Same as current user, routing to Profile');
      return { name: 'Profile' };
    } else {
      console.log('👤 Different user, routing to Users with author:', authorAddress);
      return {
        name: 'Users',
        params: { author: authorAddress },
      };
    }
  });

  // Action handlers
  const handleLike = async () => {
    console.log('❤️ handleLike called');
    console.log('❤️ wallet.value?.publicKey:', wallet.value?.publicKey);
    console.log('❤️ tweet.value?.id:', tweet.value?.id);
    console.log('❤️ isLiked.value:', isLiked.value);
    console.log('❤️ likeCount.value:', likeCount.value);
    
    if (!wallet.value?.publicKey) {
      console.log('❌ Wallet not connected. Please connect your wallet first.');
      alert('Please connect your wallet first to like beacons.');
      return;
    }
    
    if (!tweet.value?.id) {
      console.log('❌ Missing tweet ID');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      const userWallet = wallet.value.publicKey.toBase58();
      console.log('❤️ Toggling like for beacon ID:', beaconId);
      console.log('❤️ User wallet:', userWallet);
      
      if (isLiked.value) {
        console.log('❤️ Unliking beacon...');
        await interactionService.unlikeBeacon(beaconId, userWallet);
        isLiked.value = false;
        likeCount.value--;
        console.log('✅ Unliked beacon successfully');
      } else {
        console.log('❤️ Liking beacon...');
        await interactionService.likeBeacon(beaconId, userWallet);
        isLiked.value = true;
        likeCount.value++;
        console.log('✅ Liked beacon successfully');
      }
    } catch (error: any) {
      console.error('❌ Error toggling like:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const handleRug = async () => {
    console.log('☠️ handleRug called');
    console.log('☠️ wallet.value?.publicKey:', wallet.value?.publicKey);
    console.log('☠️ tweet.value?.id:', tweet.value?.id);
    console.log('☠️ isRugged.value:', isRugged.value);
    
    if (!wallet.value?.publicKey) {
      console.log('❌ Wallet not connected. Please connect your wallet first.');
      alert('Please connect your wallet first to report rugs.');
      return;
    }
    
    if (!tweet.value?.id) {
      console.log('❌ Missing tweet ID');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      const userWallet = wallet.value.publicKey.toBase58();
      console.log('☠️ Toggling rug report for beacon ID:', beaconId);
      console.log('☠️ User wallet:', userWallet);
      
      if (isRugged.value) {
        console.log('☠️ Removing rug report...');
        await reportRug(beaconId, userWallet, false);
        isRugged.value = false;
        rugCount.value--;
        console.log('✅ Rug report removed successfully');
      } else {
        console.log('☠️ Reporting as rug...');
        await reportRug(beaconId, userWallet, true);
        isRugged.value = true;
        rugCount.value++;
        console.log('✅ Rug reported successfully');
      }
    } catch (error: any) {
      console.error('❌ Error toggling rug report:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const reportRug = async (beaconId: number, userWallet: string, isRug: boolean) => {
    const response = await fetch('/api/rug-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beaconId,
        reporter: userWallet,
        reporter_display: userWallet.slice(0, 8) + '...',
        isRug
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to report rug');
    }
    
    return data;
  };

  const handleReply = () => {
    // Toggle reply form visibility
    if (showReplyModal.value) {
      // If reply form is open, close it
      showReplyModal.value = false;
    } else {
      // If reply form is closed, open it and load replies if needed
      if (!showReplies.value) {
        toggleReplies(); // Load and show replies
      }
      showReplyModal.value = true; // Show reply form
    }
  };

  const toggleTipMessages = async () => {
    if (showTipMessages.value) {
      showTipMessages.value = false;
    } else {
      if (tipMessages.value.length === 0) {
        await loadTipMessages();
      }
      showTipMessages.value = true;
    }
  };

  const submitReply = async () => {
    console.log('💬 submitReply called');
    console.log('💬 wallet.value?.publicKey:', wallet.value?.publicKey);
    console.log('💬 tweet.value?.id:', tweet.value?.id);
    console.log('💬 replyContent.value:', replyContent.value);
    console.log('💬 replyContent.value.trim():', replyContent.value.trim());
    
    if (!wallet.value?.publicKey || !tweet.value?.id || !replyContent.value.trim()) {
      console.log('❌ Missing wallet, tweet ID, or reply content');
      return;
    }
    
    try {
      const beaconId = tweet.value.id;
      const userWallet = wallet.value.publicKey.toBase58();
      const content = replyContent.value.trim();
      console.log('💬 Submitting reply for beacon ID:', beaconId);
      console.log('💬 User wallet:', userWallet);
      console.log('💬 Reply content:', content);
      
      console.log('💬 Calling interactionService.replyToBeacon...');
      await interactionService.replyToBeacon(beaconId, userWallet, content);
      console.log('✅ Reply submitted successfully');
      
      replyContent.value = '';
      showReplyModal.value = false;
      console.log('✅ Reply form cleared and hidden');
      
      // Refresh replies if they're currently shown
      if (showReplies.value) {
        await loadReplies();
      }
    } catch (error: any) {
      console.error('❌ Error submitting reply:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const handleTip = () => {
    if (!wallet.value?.publicKey) {
      alert('Please connect your wallet to send tips');
      return;
    }
    
    // Don't allow tipping yourself
    if (wallet.value.publicKey.toBase58() === tweet.value?.author?.toBase58()) {
      alert('You cannot tip yourself');
      return;
    }
    
    showTipModal.value = true;
  };

  const handleShareLink = async () => {
    if (!tweet.value?.id) {
      console.error('Cannot share: tweet ID not available');
      return;
    }

    try {
      // Find the tweet card element
      const tweetCard = document.querySelector(`[data-tweet-id="${tweet.value.id}"]`);
      if (!tweetCard) {
        console.error('Tweet card element not found');
        return;
      }

      // Use html2canvas to capture the tweet card
      const { default: html2canvas } = await import('html2canvas');
      
      const canvas = await html2canvas(tweetCard as HTMLElement, {
        backgroundColor: '#0f0f23', // Dark background
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true
      });

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          // Copy image to clipboard
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          
          console.log('✅ Beacon screenshot copied to clipboard');
          alert('Beacon screenshot copied to clipboard!');
        } catch (error) {
          console.error('❌ Failed to copy screenshot to clipboard:', error);
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `beacon-${tweet.value.id}.png`;
          a.click();
          URL.revokeObjectURL(url);
          alert('Screenshot downloaded!');
        }
      }, 'image/png');
    } catch (error) {
      console.error('❌ Failed to capture beacon screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
    }
  };

  // Tip validation
  const tipError = computed(() => {
    if (!tipAmount.value) return '';
    const amount = parseFloat(tipAmount.value);
    if (isNaN(amount)) return 'Please enter a valid number';
    if (amount < 0.001) return 'Minimum tip is 0.001 SOL';
    if (amount > 10) return 'Maximum tip is 10 SOL';
    return '';
  });

  const canSendTip = computed(() => {
    return tipAmount.value && !tipError.value && wallet.value?.publicKey;
  });

  const sendTip = async () => {
    if (!canSendTip.value || !wallet.value?.publicKey) return;

    isTipping.value = true;
    tipErrorMessage.value = '';

    try {
      const amount = parseFloat(tipAmount.value);
      
      if (usePlatformWallet.value) {
        // Use platform wallet (no Phantom approval needed)
        let sendTipWithPlatformWallet;
        try {
          const module = await import('@src/lib/x402-platform-client');
          sendTipWithPlatformWallet = module.sendTipWithPlatformWallet;
        } catch (error) {
          console.error('Failed to load x402-platform-client:', error);
          throw new Error('Platform wallet service temporarily unavailable. Please try again.');
        }
        
        const result = await sendTipWithPlatformWallet(
          tweet.value?.author?.toBase58() || '',
          amount,
          tipMessage.value || '',
          tweet.value?.id || 0,
          wallet.value.publicKey.toBase58()
        );

        if (result.success) {
          console.log('💰 Tip sent successfully from platform wallet:', result);
          tipAmount.value = '';
          tipMessage.value = '';
          showTipModal.value = false;
          // Refresh tip data and platform wallet balance
          await loadTipData();
          await loadPlatformWalletData();
        } else {
          if (result.requiresDeposit) {
            tipErrorMessage.value = 'Insufficient platform wallet balance. Please deposit more SOL or use Phantom wallet.';
          } else {
            tipErrorMessage.value = result.message || 'Failed to send tip from platform wallet';
          }
        }
      } else {
        // Use Phantom wallet (requires approval)
        const { sendTipWithPayment } = await import('@src/lib/x402-tip-client');
        
        const result = await sendTipWithPayment(
          tweet.value?.author?.toBase58() || '',
          amount,
          tipMessage.value || '',
          tweet.value?.id || 0,
          wallet.value
        );

        if (result.success) {
          console.log('💰 Tip sent successfully from Phantom:', result);
          tipAmount.value = '';
          tipMessage.value = '';
          showTipModal.value = false;
          // Refresh tip data to show updated totals
          await loadTipData();
        } else {
          tipErrorMessage.value = result.message || 'Failed to send tip';
        }
      }
    } catch (error: any) {
      console.error('Tip error:', error);
      
      if (error.message?.includes('User rejected') || error.message?.includes('rejected')) {
        tipErrorMessage.value = 'Transaction was cancelled by user';
      } else if (error.message?.includes('insufficient funds') || error.message?.includes('Insufficient')) {
        tipErrorMessage.value = 'Insufficient SOL balance. Please add funds to your wallet.';
      } else if (error.message?.includes('network') || error.message?.includes('connection')) {
        tipErrorMessage.value = 'Network error. Please check your connection and try again.';
      } else {
        tipErrorMessage.value = 'Failed to send tip. Please try again.';
      }
    } finally {
      isTipping.value = false;
    }
  };

  const handlePlatformWalletModal = () => {
    showPlatformWalletModal.value = true;
  };

  const handlePlatformWalletBalanceUpdated = async () => {
    await loadPlatformWalletData();
  };

  const handleShare = () => {
    const walletAddress = wallet.value?.publicKey?.toBase58() || 'Anonymous';
    const firstThree = walletAddress.slice(0, 3);
    const solscanUrl = `https://solscan.io/tx/${tweet.value?.treasuryTransaction}`;
    
    const shareText = `Oh you still tweet? What a loser!

Beacon like all the cool things so that all of your horrible horrrundous thoughts becomes part of the on-chain.

Anyway ${firstThree} said ${tweet.value?.content}

Solscan: ${solscanUrl}
Come beacon at @https://trenchbeacon.com/`;

    if (navigator.share) {
      navigator.share({
        title: 'Check out this beacon on Trench Beacon',
        text: shareText
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert('Beacon share text copied to clipboard!');
    }
  };
</script>

<template>
  <div class="card group relative overflow-hidden" :data-tweet-id="tweet?.id">
    
    <div class="flex items-start space-x-4 relative z-10">
      <!-- Enhanced Avatar -->
      <div class="flex-shrink-0">
        <div class="relative group/avatar">
          <div class="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center overflow-hidden transition-all duration-300">
            <img 
              v-if="shouldShowAuthorAvatar" 
              :src="safeAuthorAvatar" 
              :alt="authorDisplayName"
              class="w-full h-full object-cover"
            />
            <img 
              v-else-if="defaultAvatar"
              :src="defaultAvatar" 
              :alt="authorDisplayName"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-white font-bold text-lg">
              {{ authorDisplayName.charAt(0).toUpperCase() }}
            </span>
          </div>
          <!-- Online Status Indicator -->
          <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-dark-900"></div>
        </div>
      </div>
      
      <!-- Content -->
      <div class="flex-1 min-w-0">
        <!-- Enhanced Header -->
        <div class="flex items-center space-x-2 mb-3">
          <h3 class="font-semibold text-white group-hover:text-primary-300 transition-colors duration-300" :title="tweet?.author?.toBase58() || 'Unknown author'">
            <SafeRouterLink :to="authorRoute" class="hover:text-primary-400 transition-all duration-300 hover:scale-105 inline-block">
              {{ authorDisplayName || tweet?.author_display || 'Unknown User' }}
            </SafeRouterLink>
          </h3>
          <span class="text-dark-400">•</span>
          <time class="text-dark-400 text-sm hover:text-primary-400 transition-colors duration-300" :title="tweet?.created_at">
            <SafeRouterLink
              :to="{ name: 'Tweet', params: { tweet: tweet?.publicKey?.toBase58() } }"
              class="hover:text-primary-400 transition-all duration-300"
            >
              {{ tweet?.created_ago }}
            </SafeRouterLink>
          </time>
          <!-- Verified Badge -->
          <div class="flex items-center space-x-1">
            <svg class="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
        
        <!-- Enhanced Tweet Content -->
        <div class="text-dark-100 leading-relaxed mb-4 group-hover:text-white transition-colors duration-300">
          <p class="whitespace-pre-wrap" v-text="tweet?.content || 'No content available'"></p>
          
          <!-- Enhanced CA Indicator -->
          <div v-if="isCA" class="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl shadow-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </div>
                <div>
                  <div class="flex items-center space-x-2">
                    <span class="text-green-400 font-semibold text-sm">Contract Address Beacon</span>
                    <span class="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full font-medium">TRADABLE</span>
                  </div>
                  <p class="text-green-300/80 text-xs mt-1">Buy tokens directly from platform wallet</p>
                </div>
              </div>
              <div class="text-right">
                <div class="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">
                  {{ caAddress.slice(0, 8) }}...{{ caAddress.slice(-8) }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Enhanced Topic Tag -->
        <SafeRouterLink
          v-if="tweet?.topic"
          :to="{ name: 'Topic', params: { topic: tweet.topic } }"
          class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-primary-500/20 to-solana-500/20 text-primary-400 border border-primary-500/20 hover:from-primary-500/30 hover:to-solana-500/30 hover:text-primary-300 hover:border-primary-500/30 transition-all duration-300 cursor-pointer group/topic"
        >
          <svg class="w-4 h-4 mr-1.5 transition-transform duration-300 group-hover/topic:rotate-12" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.938l1-4H9.031z" clip-rule="evenodd" />
          </svg>
          #{{ tweet?.topic }}
        </SafeRouterLink>
        
        <!-- Treasury Transaction Link -->
        <div class="mt-3 p-2 bg-dark-800/50 border border-dark-700 rounded-lg">
          <div class="flex items-center space-x-2 text-xs text-dark-400">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
            <span>On-chain transaction:</span>
            <a 
              :href="`https://solscan.io/tx/${tweet.treasuryTransaction || tweet.publicKey.toBase58()}`" 
              target="_blank" 
              class="text-primary-400 hover:text-primary-300 transition-colors duration-300 hover:underline"
            >
              View on Solscan
            </a>
          </div>
        </div>

        <!-- Action Buttons and Tip Display -->
        <div class="flex items-center justify-between mt-4">
          <!-- Left side: Action buttons -->
          <div class="flex items-center space-x-6">
            <button 
              @click="handleLike"
              :class="[
                'flex items-center space-x-2 transition-colors duration-300 hover:scale-110',
                isLiked ? 'text-red-400' : 'text-dark-400 hover:text-red-400'
              ]"
            >
              <svg class="w-5 h-5" :fill="isLiked ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span class="text-sm">{{ likeCount }}</span>
            </button>
            
            <!-- Rug Button -->
            <button 
              @click="handleRug"
              :class="[
                'flex items-center space-x-2 transition-colors duration-300 hover:scale-110',
                isRugged ? 'text-orange-500' : 'text-dark-400 hover:text-orange-500'
              ]"
              :title="isRugged ? 'Remove rug report' : 'Report as rug (scam)'"
            >
              <svg class="w-5 h-5" :fill="isRugged ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span class="text-sm">{{ rugCount }}</span>
            </button>
            <button 
              @click="handleReply"
              class="flex items-center space-x-2 text-dark-400 hover:text-blue-400 transition-colors duration-300 hover:scale-110"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span class="text-sm">{{ showReplies ? 'Reply' : 'Replies' }}</span>
            </button>
            <button 
              @click="handleTip"
              class="flex items-center space-x-2 text-dark-400 hover:text-yellow-400 transition-colors duration-300 hover:scale-110"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              <span class="text-sm">Tip</span>
            </button>
            
            <!-- Enhanced CA Buy Button (only for CA beacons) -->
            <button 
              v-if="isCA && wallet?.publicKey"
              @click="openBuyCAModal"
              class="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-green-500/25"
              :title="'Buy ' + caAddress + ' tokens directly'"
            >
              <div class="w-5 h-5 flex items-center justify-center">
                <svg v-if="!isBuyingCA" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span class="text-sm font-semibold">{{ isBuyingCA ? 'Buying...' : 'Buy CA' }}</span>
            </button>
            
            <button 
              @click="handleShareLink"
              class="flex items-center space-x-2 text-dark-400 hover:text-green-400 transition-colors duration-300 hover:scale-110"
              :title="'Share beacon #' + tweet.id"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span class="text-sm">Share</span>
            </button>
          </div>

          <!-- Right side: Tip display -->
          <div v-if="totalTips > 0 || loadingTips" class="flex items-center space-x-2 text-yellow-400">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            <span v-if="loadingTips" class="text-sm text-dark-400">Loading...</span>
            <span v-else class="text-sm font-semibold">
              {{ totalTips.toFixed(3) }} SOL
              <span v-if="tipCount > 1" class="text-dark-400 text-xs ml-1">({{ tipCount }} tips)</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tip Messages Section -->
    <div v-if="tipCount > 0" class="mt-3 border-t border-dark-700 pt-3">
      <div class="flex items-center justify-between mb-2">
        <button 
          @click="toggleTipMessages"
          class="flex items-center space-x-2 text-yellow-400 hover:text-yellow-300 transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
          <span class="text-sm font-medium">
            {{ tipCount }} tip{{ tipCount > 1 ? 's' : '' }} ({{ totalTips.toFixed(3) }} SOL)
          </span>
          <svg 
            :class="['w-3 h-3 transition-transform', showTipMessages ? 'rotate-180' : '']" 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div v-if="showTipMessages">
        <div v-if="loadingTipMessages" class="text-center py-2">
          <div class="text-dark-400 text-sm">Loading tip messages...</div>
        </div>
        
        <div v-else-if="tipMessages.length === 0" class="text-center py-2">
          <div class="text-dark-400 text-sm">No tip messages yet</div>
        </div>
        
        <div v-else class="space-y-2 max-h-32 overflow-y-auto">
          <div 
            v-for="tip in tipMessages" 
            :key="tip.id"
            class="flex items-start space-x-2 p-2 bg-dark-800/50 rounded-lg"
          >
            <div class="flex-shrink-0 w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <span class="text-xs font-medium text-yellow-400">{{ tip.recipient_amount || tip.amount }} SOL</span>
                <span class="text-xs text-dark-400">from</span>
                <span class="text-xs text-primary-400">{{ tip.tipper_display || tip.tipper?.slice(0, 8) + '...' }}</span>
                <span v-if="tip.treasury_fee && tip.treasury_fee > 0" class="text-xs text-dark-500">(+{{ tip.treasury_fee }} SOL to treasury)</span>
              </div>
              <div v-if="tip.message" class="text-xs text-dark-300 mt-1">{{ tip.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Replies Section - Only show if there are replies -->
    <div v-if="showReplies && replies.length > 0" class="mt-4 border-t border-dark-700 pt-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-sm font-medium text-dark-300">Replies ({{ replies.length }})</h4>
        <button 
          @click="toggleReplies"
          class="text-xs text-dark-400 hover:text-primary-400 transition-colors"
        >
          Hide
        </button>
      </div>
      
      <div v-if="loadingReplies" class="text-center py-4">
        <div class="text-dark-400 text-sm">Loading replies...</div>
      </div>
      
      <!-- Scrollable replies container for 3+ replies -->
      <div 
        v-else 
        :class="[
          'space-y-3',
          replies.length > 3 ? 'max-h-64 overflow-y-auto pr-2' : ''
        ]"
      >
        <div 
          v-for="reply in replies" 
          :key="reply.id"
          class="bg-dark-800/30 border border-dark-700 rounded-lg p-3"
        >
          <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-solana-500 flex items-center justify-center flex-shrink-0">
              <span class="text-white font-bold text-sm">
                {{ reply.user_wallet?.slice(0, 2).toUpperCase() || 'U' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2 mb-1">
                <span class="text-sm font-medium text-white">
                  {{ reply.user_wallet?.slice(0, 8) + '...' || 'Anonymous' }}
                </span>
                <span class="text-xs text-dark-400">
                  {{ new Date(reply.created_at).toLocaleString() }}
                </span>
              </div>
              <p class="text-dark-100 text-sm">{{ reply.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inline Reply Box -->
    <div v-if="showReplyModal" class="mt-4 p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
      <div class="flex flex-col space-y-3">
        <textarea
          v-model="replyContent"
          placeholder="Write your reply..."
          class="input-field w-full h-20 resize-none"
          maxlength="280"
        ></textarea>
        <div class="flex justify-center">
          <button 
            @click="submitReply"
            :disabled="!replyContent.trim()"
            class="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Reply
          </button>
        </div>
      </div>
    </div>

    <!-- Inline Tip Box -->
    <div v-if="showTipModal" class="mt-4 p-4 bg-dark-800/50 border border-dark-700 rounded-lg">
      <div class="flex flex-col space-y-3">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <svg class="w-5 h-5 mr-2 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
            Tip {{ authorDisplayName }}
          </h3>
          <button @click="showTipModal = false" class="text-dark-400 hover:text-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <!-- Tip Amount Input -->
        <div>
          <label class="block text-sm font-medium text-dark-300 mb-1">
            Tip Amount (SOL)
          </label>
          <div class="relative">
            <input
              v-model="tipAmount"
              type="number"
              step="0.001"
              min="0.001"
              max="10"
              placeholder="0.001"
              class="input-field w-full pl-8 pr-4"
              :class="{ 'border-red-500': tipError }"
            />
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2">
              <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
          </div>
          <p v-if="tipError" class="text-red-400 text-sm mt-1">{{ tipError }}</p>
          <p class="text-dark-400 text-xs mt-1">
            Min: 0.001 SOL • Max: 10 SOL
          </p>
          
          <!-- Treasury Fee Info -->
          <div v-if="tipAmount && parseFloat(tipAmount) > 0" class="mt-2 p-2 bg-dark-700/50 rounded-lg text-xs">
            <div class="flex justify-between items-center text-dark-300">
              <span>Recipient receives:</span>
              <span class="text-yellow-400 font-medium">{{ (parseFloat(tipAmount) * 0.95).toFixed(6) }} SOL</span>
            </div>
            <div class="flex justify-between items-center text-dark-400 mt-1">
              <span>Treasury fee (5%):</span>
              <span class="text-primary-400">{{ (parseFloat(tipAmount) * 0.05).toFixed(6) }} SOL</span>
            </div>
          </div>
        </div>

        <!-- Tip Message -->
        <div>
          <label class="block text-sm font-medium text-dark-300 mb-1">
            Message (Optional)
          </label>
          <textarea
            v-model="tipMessage"
            placeholder="Say something nice..."
            rows="2"
            class="input-field w-full resize-none"
          ></textarea>
        </div>

        <!-- Wallet Selection -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-white">Choose Payment Method</h4>
          
          <!-- Platform Wallet Option -->
          <div class="p-3 border rounded-lg" :class="usePlatformWallet ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-dark-600'">
            <label class="flex items-center space-x-3 cursor-pointer">
              <input
                v-model="usePlatformWallet"
                type="radio"
                :value="true"
                class="text-yellow-500 focus:ring-yellow-500"
              />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-white">Platform Wallet</span>
                  <span class="text-xs text-yellow-400">{{ platformBalance.toFixed(6) }} SOL</span>
                </div>
                <p class="text-xs text-dark-400 mt-1">Instant tips without Phantom approval</p>
              </div>
            </label>
          </div>

          <!-- Phantom Wallet Option -->
          <div class="p-3 border rounded-lg" :class="!usePlatformWallet ? 'border-blue-500/50 bg-blue-500/10' : 'border-dark-600'">
            <label class="flex items-center space-x-3 cursor-pointer">
              <input
                v-model="usePlatformWallet"
                type="radio"
                :value="false"
                class="text-blue-500 focus:ring-blue-500"
              />
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-white">Phantom Wallet</span>
                  <span class="text-xs text-blue-400">Requires approval</span>
                </div>
                <p class="text-xs text-dark-400 mt-1">Traditional wallet with popup approval</p>
              </div>
            </label>
          </div>

          <!-- Platform Wallet Management -->
          <div v-if="usePlatformWallet" class="flex space-x-2">
            <button
              @click="handlePlatformWalletModal"
              class="btn-secondary text-xs px-3 py-1"
            >
              Manage Platform Wallet
            </button>
            <span class="text-xs text-dark-400 self-center">
              Deposit SOL for instant tips
            </span>
          </div>
        </div>

        <!-- Payment Info -->
        <div class="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div class="flex items-center justify-between text-sm">
            <span class="text-dark-300">Total Payment:</span>
            <span class="text-yellow-400 font-semibold">{{ tipAmount || '0.000' }} SOL</span>
          </div>
          <div class="flex items-center justify-between text-sm mt-1">
            <span class="text-dark-300">To:</span>
            <span class="text-dark-300 font-mono text-xs">{{ tweet?.author?.toBase58().slice(0, 8) }}...{{ tweet?.author?.toBase58().slice(-8) }}</span>
          </div>
          <div v-if="usePlatformWallet" class="flex items-center justify-between text-sm mt-1">
            <span class="text-dark-300">From:</span>
            <span class="text-yellow-400 text-xs">Platform Wallet</span>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="tipErrorMessage" class="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
          {{ tipErrorMessage }}
        </div>

        <!-- Action Buttons -->
        <div class="flex space-x-3">
          <button
            @click="showTipModal = false"
            class="btn-secondary flex-1"
            :disabled="isTipping"
          >
            Cancel
          </button>
          <button
            @click="sendTip"
            :disabled="!canSendTip || isTipping"
            class="btn-primary flex-1"
            :class="(!canSendTip || isTipping) ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <span v-if="isTipping" class="flex items-center justify-center">
              <svg class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
            <span v-else>Send Tip</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Platform Wallet Modal -->
    <PlatformWalletModal
      :is-open="showPlatformWalletModal"
      @close="showPlatformWalletModal = false"
      @balance-updated="handlePlatformWalletBalanceUpdated"
    />

    <!-- Buy CA Modal -->
    <div 
      v-if="showBuyCAModal" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-start justify-center p-4 pt-20"
      @click.self="closeBuyCAModal"
    >
      <div class="bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl border border-dark-700/50 w-full max-w-lg overflow-hidden shadow-2xl backdrop-blur-xl relative mt-8">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-dark-700/50 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">Buy CA Tokens</h3>
              <p class="text-dark-400 text-sm">Purchase tokens for this contract address</p>
            </div>
          </div>
          <button 
            @click="closeBuyCAModal"
            class="text-dark-400 hover:text-white transition-colors p-2 hover:bg-dark-700 rounded-lg"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="p-8">
          <!-- Contract Address Display -->
          <div class="mb-8 p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div class="flex items-center space-x-3 mb-3">
              <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              <span class="text-green-400 font-semibold text-base">Contract Address</span>
            </div>
            <p class="text-green-300 font-mono text-sm break-all bg-dark-800/50 p-3 rounded-lg">{{ caAddress }}</p>
          </div>

          <!-- Amount Input -->
          <div class="mb-8">
            <label class="block text-base font-semibold text-white mb-4">Amount (SOL)</label>
            
            <!-- Quick Selection Buttons -->
            <div class="flex space-x-3 mb-6">
              <button
                @click="setQuickAmount('0.1')"
                :class="buyAmount === '0.1' ? 'bg-green-500 text-white shadow-lg' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'"
                class="px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
              >
                0.1 SOL
              </button>
              <button
                @click="setQuickAmount('0.5')"
                :class="buyAmount === '0.5' ? 'bg-green-500 text-white shadow-lg' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'"
                class="px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
              >
                0.5 SOL
              </button>
              <button
                @click="setQuickAmount('1')"
                :class="buyAmount === '1' ? 'bg-green-500 text-white shadow-lg' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'"
                class="px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105"
              >
                1 SOL
              </button>
            </div>
            
            <div class="relative">
              <input
                v-model="buyAmount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.1"
                class="w-full px-6 py-4 bg-dark-800 border-2 border-dark-600 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all duration-300 text-lg"
              />
              <div class="absolute right-4 top-1/2 transform -translate-y-1/2 text-dark-400 text-base font-medium">
                SOL
              </div>
            </div>
            <p class="text-sm text-dark-400 mt-2">Enter the amount of SOL you want to spend</p>
          </div>

          <!-- Error Message -->
          <div v-if="caBuyError" class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div class="flex items-center space-x-3">
              <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              <span class="text-red-400 text-sm font-medium">{{ caBuyError }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex space-x-4">
            <button 
              @click="closeBuyCAModal"
              class="flex-1 px-6 py-4 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors font-semibold text-base"
            >
              Cancel
            </button>
            <button 
              @click="buyCA"
              :disabled="isBuyingCA || !buyAmount"
              class="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-base shadow-lg hover:shadow-green-500/25"
            >
              <div class="flex items-center justify-center space-x-3">
                <svg v-if="isBuyingCA" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span>{{ isBuyingCA ? 'Buying...' : 'Buy Tokens' }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

