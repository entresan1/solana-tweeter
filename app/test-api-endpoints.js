// Simple test script to verify API endpoints are working
const fetch = require('node-fetch');

async function testAPIEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test user profiles API
    console.log('1. Testing user profiles API...');
    const profileResponse = await fetch(`${baseUrl}/api/user-profiles?walletAddress=F7NdkGsGCFpPyaSsp4paAURZyQjTPHCCQjQHm6NwypTY`);
    console.log('   Status:', profileResponse.status);
    if (profileResponse.ok) {
      const data = await profileResponse.json();
      console.log('   ✅ User profiles API working');
    } else {
      console.log('   ❌ User profiles API failed');
    }
    
    // Test beacon interactions API
    console.log('\n2. Testing beacon interactions API...');
    const interactionsResponse = await fetch(`${baseUrl}/api/beacon-interactions?beaconId=1`);
    console.log('   Status:', interactionsResponse.status);
    if (interactionsResponse.ok) {
      const data = await interactionsResponse.json();
      console.log('   ✅ Beacon interactions API working');
    } else {
      console.log('   ❌ Beacon interactions API failed');
    }
    
    // Test beacon replies API
    console.log('\n3. Testing beacon replies API...');
    const repliesResponse = await fetch(`${baseUrl}/api/beacon-replies?beaconId=1`);
    console.log('   Status:', repliesResponse.status);
    if (repliesResponse.ok) {
      const data = await repliesResponse.json();
      console.log('   ✅ Beacon replies API working');
    } else {
      console.log('   ❌ Beacon replies API failed');
    }
    
    console.log('\n🎉 API endpoint testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAPIEndpoints();
