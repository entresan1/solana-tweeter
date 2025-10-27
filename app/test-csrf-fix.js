// Simple test to verify CSRF fix is working
const fetch = require('node-fetch');

async function testCSRFFix() {
  console.log('🧪 Testing CSRF fix...');
  
  try {
    // Step 1: Get CSRF token
    console.log('1. Fetching CSRF token...');
    const csrfResponse = await fetch('http://localhost:3000/api/csrf', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (!csrfResponse.ok) {
      throw new Error(`CSRF endpoint failed: ${csrfResponse.status}`);
    }
    
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.token;
    console.log('✅ CSRF token received:', csrfToken);
    
    // Step 2: Test like functionality with CSRF token
    console.log('2. Testing like functionality...');
    const likeResponse = await fetch('http://localhost:3000/api/beacon-interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        beaconId: 1,
        userWallet: '11111111111111111111111111111112', // Test wallet
        action: 'like'
      })
    });
    
    const likeData = await likeResponse.json();
    console.log('Like response status:', likeResponse.status);
    console.log('Like response data:', likeData);
    
    if (likeResponse.status === 403) {
      console.log('❌ CSRF validation failed - token not accepted');
      return false;
    } else if (likeResponse.status === 200 || likeResponse.status === 201) {
      console.log('✅ CSRF validation passed - like request succeeded');
    } else {
      console.log('⚠️ Unexpected response status:', likeResponse.status);
    }
    
    // Step 3: Test reply functionality with CSRF token
    console.log('3. Testing reply functionality...');
    const replyResponse = await fetch('http://localhost:3000/api/beacon-replies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        beaconId: 1,
        userWallet: '11111111111111111111111111111112', // Test wallet
        content: 'Test reply for CSRF validation'
      })
    });
    
    const replyData = await replyResponse.json();
    console.log('Reply response status:', replyResponse.status);
    console.log('Reply response data:', replyData);
    
    if (replyResponse.status === 403) {
      console.log('❌ CSRF validation failed - token not accepted');
      return false;
    } else if (replyResponse.status === 200 || replyResponse.status === 201) {
      console.log('✅ CSRF validation passed - reply request succeeded');
    } else {
      console.log('⚠️ Unexpected response status:', replyResponse.status);
    }
    
    console.log('🎉 CSRF fix test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testCSRFFix().then(success => {
  process.exit(success ? 0 : 1);
});
