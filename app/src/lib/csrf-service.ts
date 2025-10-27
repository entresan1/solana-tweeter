// CSRF token service for secure API calls
class CSRFService {
  private static instance: CSRFService;
  private csrfToken: string | null = null;
  private tokenPromise: Promise<string> | null = null;

  public static getInstance(): CSRFService {
    if (!CSRFService.instance) {
      CSRFService.instance = new CSRFService();
    }
    return CSRFService.instance;
  }

  // Get CSRF token (always fetch fresh)
  async getToken(): Promise<string> {
    // Always fetch a fresh token to avoid caching issues
    return this.fetchToken();
  }

  // Fetch CSRF token from server
  private async fetchToken(): Promise<string> {
    try {
      // Use a simple GET request to any endpoint that returns CSRF token
      const response = await fetch('/api/beacons?limit=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const token = response.headers.get('X-CSRF-Token');
      if (token) {
        console.log('🔐 CSRF token received:', token);
        return token;
      }

      throw new Error('No CSRF token received');
    } catch (error) {
      console.error('❌ Failed to get CSRF token:', error);
      throw error;
    }
  }

  // Clear token (for logout, etc.)
  clearToken(): void {
    this.csrfToken = null;
    this.tokenPromise = null;
  }

  // Make authenticated request with CSRF token
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken();
    
    console.log('🔐 Making authenticated request to:', url);
    console.log('🔐 Using CSRF token:', token);
    
    const headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': token,
      ...options.headers
    };

    console.log('🔐 Request headers:', headers);

    const response = await fetch(url, {
      ...options,
      headers
    });
    
    console.log('🔐 Response status:', response.status);
    
    return response;
  }
}

export const csrfService = CSRFService.getInstance();
