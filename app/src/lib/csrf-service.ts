// Enhanced CSRF token service with comprehensive header support
export type AuthContext = {
  walletAddress?: string;
  walletSignature?: string; // if you sign a nonce server expects
  bearerToken?: string;     // if you use JWT (e.g., Supabase/NextAuth)
};

// Cookie helper
function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

let cached = { token: '' as string, ts: 0 };

async function fetchCsrf(): Promise<string> {
  const now = Date.now();
  if (cached.token && now - cached.ts < 5 * 60_000) return cached.token;

  console.debug('[csrf] Fetching CSRF token');
  console.debug('[csrf] Origin:', location.origin);
  console.debug('[csrf] Has cookies:', document.cookie.length > 0);
  console.debug('[csrf] XSRF cookie:', document.cookie.includes('XSRF-TOKEN='));

  // Use beacons endpoint to get CSRF token (fallback until /api/csrf is deployed)
  const res = await fetch('/api/beacons?limit=1', {
    method: 'GET',
    credentials: 'include',
    headers: { 
      'Accept': 'application/json', 
      'X-Requested-With': 'XMLHttpRequest' 
    },
  }).catch(() => null as any);

  let token = '';
  if (res && res.ok) {
    // token may be in body OR header (check both cases)
    const headerTok = res.headers.get('x-csrf-token') || res.headers.get('X-Csrf-Token') || res.headers.get('x-xsrf-token') || res.headers.get('X-CSRF-Token');
    if (headerTok) token = headerTok;
    else {
      try { 
        const data = await res.json();
        token = data?.token || ''; 
      } catch { /* ignore */ }
    }
  }

  // If still empty, try cookie (double-submit cookie pattern)
  if (!token) {
    token = getCookie('XSRF-TOKEN') || getCookie('xsrf-token') || getCookie('csrfToken') || getCookie('X-CSRF-Token') || '';
  }
  
  if (!token) {
    console.error('❌ No CSRF token available (endpoint/cookie both empty)');
    throw new Error('No CSRF token available (endpoint/cookie both empty).');
  }

  cached = { token, ts: now };
  console.log('🔐 CSRF token received:', token);
  return token;
}

export async function authFetch(url: string, init: RequestInit = {}, auth?: AuthContext) {
  const token = await fetchCsrf();

  // Build headers with the primary CSRF header name that our server expects
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    // Primary header name that our server expects
    'X-CSRF-Token': token,
  };
  
  if (auth?.bearerToken) base['Authorization'] = `Bearer ${auth.bearerToken}`;
  if (auth?.walletAddress) base['X-Wallet-Address'] = auth.walletAddress;
  if (auth?.walletSignature) base['X-Wallet-Signature'] = auth.walletSignature;

  console.debug('[csrf] Making request to:', url);
  console.debug('[csrf] Headers:', Object.keys(base));
  console.debug('[csrf] Auth context:', auth ? 'present' : 'none');
  console.debug('[csrf] Full headers being sent:', JSON.stringify(base, null, 2));
  console.debug('[csrf] Token being sent:', token);

  const doFetch = async () => {
    const res = await fetch(url, {
      ...init,
      headers: { ...base, ...(init.headers as any) },
      credentials: 'include', // send cookies with request
    });
    
    console.debug('[csrf] Response status:', res.status);
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('❌ Request failed:', res.status, res.statusText, text);
      const err: any = new Error(`HTTP ${res.status} :: ${text}`);
      err.status = res.status;
      err.body = text;
      err.url = url;
      throw err;
    }
    
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json') ? res.json() : res.text();
  };

  try {
    return await doFetch();
  } catch (e: any) {
    // If token rotated or cookie updated, refetch once
    if (e?.status === 403 || e?.status === 419) {
      console.log('🔄 CSRF token expired, refreshing...');
      cached = { token: '', ts: 0 };
      await fetchCsrf();
      return await doFetch();
    }
    throw e;
  }
}

// Legacy compatibility
export const csrfService = {
  async getToken(): Promise<string> {
    return fetchCsrf();
  },
  
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const result = await authFetch(url, options);
    return result as any; // Type assertion for compatibility
  },
  
  clearToken(): void {
    cached = { token: '', ts: 0 };
  }
};

// Export the new function for direct use
export { authFetch as makeAuthenticatedRequest };
