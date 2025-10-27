// 60-second CSRF diagnostics script
// Run this in browser console to test CSRF token flow

async function testCSRFFlow() {
  console.log('🔍 Starting CSRF diagnostics...');
  
  // Step 1: Get CSRF token
  console.log('\n1️⃣ Fetching CSRF token...');
  try {
    const csrfResponse = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    console.log('CSRF Response status:', csrfResponse.status);
    console.log('CSRF Response headers:', Object.fromEntries(csrfResponse.headers.entries()));
    
    const csrfData = await csrfResponse.json();
    console.log('CSRF Response body:', csrfData);
    
    // Check cookies
    console.log('Document cookies:', document.cookie);
    console.log('XSRF-TOKEN cookie present:', document.cookie.includes('XSRF-TOKEN='));
    
  } catch (error) {
    console.error('❌ Failed to fetch CSRF token:', error);
    return;
  }
  
  // Step 2: Test POST with CSRF token
  console.log('\n2️⃣ Testing POST request with CSRF token...');
  
  // Get token from cookie
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  
  const token = getCookie('XSRF-TOKEN');
  console.log('Token from cookie:', token);
  
  if (!token) {
    console.error('❌ No CSRF token found in cookies');
    return;
  }
  
  try {
    const testResponse = await fetch('/api/beacon-interactions', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': token,
        'X-CSRF-Token': token,
        'X-CSRFToken': token,
      },
      body: JSON.stringify({
        beaconId: 1,
        userWallet: 'F7N...', // dummy wallet
        action: 'like'
      })
    });
    
    console.log('Test POST status:', testResponse.status);
    console.log('Test POST headers:', Object.fromEntries(testResponse.headers.entries()));
    
    const testData = await testResponse.text();
    console.log('Test POST response:', testData);
    
    if (testResponse.ok) {
      console.log('✅ CSRF flow working correctly!');
    } else {
      console.log('❌ CSRF flow failed - check server logs');
    }
    
  } catch (error) {
    console.error('❌ Test POST failed:', error);
  }
}

// Run diagnostics
testCSRFFlow();
