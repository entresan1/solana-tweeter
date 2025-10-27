import { useWallet } from 'solana-wallets-vue';

// CSRF token management
let csrfToken: string | null = null;

// Get CSRF token from server
async function getCSRFToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  try {
    const response = await fetch('/api/user-profiles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const token = response.headers.get('X-CSRF-Token');
      if (token) {
        csrfToken = token;
        return token;
      }
    }
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
  }

  throw new Error('Failed to obtain CSRF token');
}

// Enhanced fetch with security headers
async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { wallet } = useWallet();
  
  // Add CSRF token for state-changing operations
  if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
    try {
      const token = await getCSRFToken();
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': token,
      };
    } catch (error) {
      console.warn('Could not add CSRF token:', error);
    }
  }

  // Add security headers
  options.headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...options.headers,
  };

  const response = await fetch(url, options);

  // Update CSRF token if provided in response
  const newToken = response.headers.get('X-CSRF-Token');
  if (newToken) {
    csrfToken = newToken;
  }

  return response;
}

// Enhanced API client with security features
export class SecureAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // User Profiles API
  async getUserProfile(walletAddress: string) {
    const response = await secureFetch(`${this.baseUrl}/api/user-profiles?walletAddress=${encodeURIComponent(walletAddress)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.profile;
    } else {
      throw new Error(data.error || 'Failed to fetch profile');
    }
  }

  async upsertProfile(profile: any) {
    const response = await secureFetch(`${this.baseUrl}/api/user-profiles`, {
      method: 'POST',
      body: JSON.stringify({ profile })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.profile;
    } else {
      throw new Error(data.error || 'Failed to upsert profile');
    }
  }

  async updateProfile(walletAddress: string, profile: any) {
    const response = await secureFetch(`${this.baseUrl}/api/user-profiles`, {
      method: 'PUT',
      body: JSON.stringify({ walletAddress, profile })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.profile;
    } else {
      throw new Error(data.error || 'Failed to update profile');
    }
  }

  // Beacon Interactions API
  async getBeaconInteractions(beaconId: number, userWallet?: string) {
    const url = userWallet 
      ? `${this.baseUrl}/api/beacon-interactions?beaconId=${beaconId}&userWallet=${encodeURIComponent(userWallet)}`
      : `${this.baseUrl}/api/beacon-interactions?beaconId=${beaconId}`;

    const response = await secureFetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        likeCount: data.likeCount,
        rugCount: data.rugCount,
        hasUserLiked: data.hasUserLiked,
        hasUserRugged: data.hasUserRugged
      };
    } else {
      throw new Error(data.error || 'Failed to fetch interactions');
    }
  }

  async likeBeacon(beaconId: number, userWallet: string) {
    const response = await secureFetch(`${this.baseUrl}/api/beacon-interactions`, {
      method: 'POST',
      body: JSON.stringify({ beaconId, userWallet, action: 'like' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.like;
    } else {
      throw new Error(data.error || 'Failed to like beacon');
    }
  }

  async unlikeBeacon(beaconId: number, userWallet: string) {
    const response = await secureFetch(`${this.baseUrl}/api/beacon-interactions`, {
      method: 'DELETE',
      body: JSON.stringify({ beaconId, userWallet, action: 'like' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return true;
    } else {
      throw new Error(data.error || 'Failed to unlike beacon');
    }
  }

  async rugBeacon(beaconId: number, userWallet: string) {
    const response = await secureFetch(`${this.baseUrl}/api/beacon-interactions`, {
      method: 'POST',
      body: JSON.stringify({ beaconId, userWallet, action: 'rug' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.rug;
    } else {
      throw new Error(data.error || 'Failed to rug beacon');
    }
  }

  async unrugBeacon(beaconId: number, userWallet: string) {
    const response = await secureFetch(`${this.baseUrl}/api/beacon-interactions`, {
      method: 'DELETE',
      body: JSON.stringify({ beaconId, userWallet, action: 'rug' })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return true;
    } else {
      throw new Error(data.error || 'Failed to unrug beacon');
    }
  }

  // Beacon Replies API
  async getBeaconReplies(beaconId: number) {
    const response = await secureFetch(`${this.baseUrl}/api/beacon-replies?beaconId=${beaconId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.replies || [];
    } else {
      throw new Error(data.error || 'Failed to fetch replies');
    }
  }

  async createReply(beaconId: number, userWallet: string, content: string) {
    const response = await secureFetch(`${this.baseUrl}/api/beacon-replies`, {
      method: 'POST',
      body: JSON.stringify({ beaconId, userWallet, content })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return data.reply;
    } else {
      throw new Error(data.error || 'Failed to create reply');
    }
  }

  // Clear CSRF token (useful for logout)
  clearCSRFToken() {
    csrfToken = null;
  }
}

// Export singleton instance
export const secureAPIClient = new SecureAPIClient();
