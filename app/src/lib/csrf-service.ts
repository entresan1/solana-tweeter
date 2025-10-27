// Enhanced CSRF token service for secure API calls
export type AuthContext = {
  walletAddress?: string;
  walletSignature?: string; // if you sign a nonce server expects
  bearerToken?: string;     // if you use JWT (e.g., Supabase/NextAuth)
};

let cachedToken: string | null = null;
let lastFetchedAt = 0;

async function fetchCsrfToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now - lastFetchedAt < 5 * 60_000) return cachedToken;

  console.debug('[csrf] Fetching CSRF token from /api/beacons');
  console.debug('[csrf] Origin:', location.origin);
  console.debug('[csrf] Has cookies:', document.cookie.length > 0);

  const res = await fetch('/api/beacons?limit=1', {
    method: 'GET',
    credentials: 'include',              // IMPORTANT
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  // Prefer header; fallback to JSON body if API provides it there
  const token = res.headers.get('x-csrf-token') || res.headers.get('X-CSRF-Token');
  
  if (!token) {
    console.error('❌ No CSRF token in response headers');
    throw new Error('No CSRF token from /api/beacons');
  }
  
  cachedToken = String(token);
  lastFetchedAt = now;
  console.log('🔐 CSRF token received:', token);
  return cachedToken!;
}

type ReqOpts = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
  auth?: AuthContext;
};

export async function makeAuthenticatedRequest(
  url: string,
  opts: ReqOpts = {},
) {
  const token = await fetchCsrfToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token,
    'X-Requested-With': 'XMLHttpRequest',
    ...(opts.headers || {}),
  };

  // Attach optional auth
  if (opts.auth?.bearerToken) headers['Authorization'] = `Bearer ${opts.auth.bearerToken}`;
  if (opts.auth?.walletAddress) headers['X-Wallet-Address'] = opts.auth.walletAddress;
  if (opts.auth?.walletSignature) headers['X-Wallet-Signature'] = opts.auth.walletSignature;

  console.debug('[csrf] Making request to:', url);
  console.debug('[csrf] Headers:', Object.keys(headers));
  console.debug('[csrf] Auth context:', opts.auth ? 'present' : 'none');

  const doFetch = async () => {
    const res = await fetch(url, {
      ...opts,
      headers,
      credentials: 'include', // IMPORTANT for session cookie
    });
    
    console.debug('[csrf] Response status:', res.status);
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ Request failed:', res.status, res.statusText, text);
      const err = new Error(`HTTP ${res.status} ${res.statusText} :: ${text}`);
      (err as any).status = res.status;
      (err as any).body = text;
      throw err;
    }
    
    // Return JSON if possible, else text
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.text();
  };

  try {
    return await doFetch();
  } catch (e: any) {
    // If CSRF expired (419) or we got 403 possibly due to rotation, refresh once
    if (e?.status === 419 || e?.status === 403) {
      console.log('🔄 CSRF token expired, refreshing...');
      cachedToken = null;
      await fetchCsrfToken();
      return await doFetch();
    }
    throw e;
  }
}

// Legacy compatibility
export const csrfService = {
  async getToken(): Promise<string> {
    return fetchCsrfToken();
  },
  
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const result = await makeAuthenticatedRequest(url, options);
    return result as any; // Type assertion for compatibility
  },
  
  clearToken(): void {
    cachedToken = null;
  }
};
