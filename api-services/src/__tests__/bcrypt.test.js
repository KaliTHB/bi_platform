#!/usr/bin/env node

/**
 * Simple bcrypt Test Script (No Database Required)
 * Quick test for bcrypt functionality
 * 
 * Usage: node simple-bcrypt-test.js
 */

const bcrypt = require('bcryptjs');

// Test cases from your application
const testCases = [
  {
    name: 'Admin User (from migration)',
    password: 'admin123',
    hash: '$2b$12$2EXOOGy6DG5aG9ZWJYzNHhQzEu7.D1K1p/a0dL8fyeXHgYgLdGe5'
  },
  {
    name: 'Test User (from tests)',
    password: 'testpassword', 
    hash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
  }
];

async function quickTest() {
  console.log('🧪 Quick bcrypt Test');
  console.log('===================\n');

  // Test 1: Generate and verify a new hash
  console.log('1. Testing basic bcrypt functionality:');
  const testPassword = 'mytest123';
  console.log(`   Password: "${testPassword}"`);
  
  const newHash = await bcrypt.hash(testPassword, 12);
  console.log(`   Generated hash: ${newHash}`);
  
  const isNewValid = await bcrypt.compare(testPassword, newHash);
  console.log(`   Verification: ${isNewValid ? '✅ SUCCESS' : '❌ FAILED'}\n`);

  // Test 2: Test your specific cases
  console.log('2. Testing your application hashes:');
  for (const testCase of testCases) {
    console.log(`   --- ${testCase.name} ---`);
    console.log(`   Password: "${testCase.password}"`);
    console.log(`   Hash: ${testCase.hash}`);
    
    try {
      const startTime = Date.now();
      const isValid = await bcrypt.compare(testCase.password, testCase.hash);
      const endTime = Date.now();
      
      console.log(`   Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`   Time: ${endTime - startTime}ms`);
      
      if (!isValid) {
        console.log('   🔍 Debugging:');
        console.log(`     - Hash format: ${testCase.hash.substring(0, 4)}`);
        console.log(`     - Hash length: ${testCase.hash.length}`);
        console.log(`     - Rounds: ${testCase.hash.split('$')[2]}`);
        
        // Test with a fresh hash to see if it's the password or hash
        const freshHash = await bcrypt.hash(testCase.password, 12);
        const freshTest = await bcrypt.compare(testCase.password, freshHash);
        console.log(`     - Fresh hash test: ${freshTest ? '✅' : '❌'}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    console.log('');
  }

  // Test 3: Cross-compatibility test
  console.log('3. Cross-compatibility test:');
  const password = 'compatibility_test';
  
  // Generate with different rounds
  const hash10 = await bcrypt.hash(password, 10);
  const hash12 = await bcrypt.hash(password, 12);
  
  console.log(`   Password: "${password}"`);
  console.log(`   Hash (10 rounds): ${hash10.substring(0, 25)}...`);
  console.log(`   Hash (12 rounds): ${hash12.substring(0, 25)}...`);
  
  const test10 = await bcrypt.compare(password, hash10);
  const test12 = await bcrypt.compare(password, hash12);
  
  console.log(`   10 rounds verification: ${test10 ? '✅' : '❌'}`);
  console.log(`   12 rounds verification: ${test12 ? '✅' : '❌'}`);

  console.log('\n4. Environment info:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform} ${process.arch}`);
  
  try {
    const bcryptVersion = require('bcryptjs/package.json').version;
    console.log(`   bcryptjs: ${bcryptVersion}`);
  } catch (e) {
    console.log('   bcryptjs: Version not found');
  }
  
  console.log('\n✅ Quick test completed!');
  
  // Provide next steps
  console.log('\n💡 Next steps:');
  console.log('1. If all tests pass, bcrypt is working correctly');
  console.log('2. If admin hash fails, check your database migration');
  console.log('3. Try logging in with admin@localhost.com / admin123');
  console.log('4. Check your AuthService.authenticateUser method');
}

// Run the test
quickTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});