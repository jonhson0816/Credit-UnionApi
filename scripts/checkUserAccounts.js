const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const checkUserAccounts = async () => {
  try {
    console.log('🔍 Checking user account storage...\n');
    
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    // Get all users
    const users = await User.find().lean();
    console.log(`📊 Total users in database: ${users.length}\n`);
    
    for (const user of users) {
      console.log('═════════════════════════════════════════');
      console.log(`User ID: ${user._id}`);
      console.log(`Name: ${user.firstName} ${user.lastName}`);
      console.log(`Email: ${user.email}`);
      console.log(`Username: ${user.username}`);
      console.log(`\n📦 Accounts property exists: ${user.accounts !== undefined}`);
      console.log(`📦 Accounts is array: ${Array.isArray(user.accounts)}`);
      console.log(`📦 Accounts length: ${user.accounts?.length || 0}`);
      
      if (user.accounts && user.accounts.length > 0) {
        console.log(`\n✅ User HAS ${user.accounts.length} account(s):\n`);
        user.accounts.forEach((acc, idx) => {
          console.log(`   Account ${idx + 1}:`);
          console.log(`     - Account ID: ${acc._id}`);
          console.log(`     - Account Type: ${acc.accountType}`);
          console.log(`     - Account Number: ${acc.accountNumber}`);
          console.log(`     - Balance: $${acc.balance}`);
          console.log(`     - Status: ${acc.status || 'active'}`);
          console.log(`     - Routing: ${acc.routingNumber || 'N/A'}`);
        });
      } else {
        console.log(`\n❌ User has NO accounts in the accounts array!`);
        console.log(`\n🔍 Checking if user has account data in other fields...`);
        
        // Check all user fields
        const userKeys = Object.keys(user);
        console.log(`\n📋 User document fields: ${userKeys.join(', ')}`);
        
        // Check if there's any account-related data
        const accountRelatedFields = userKeys.filter(key => 
          key.toLowerCase().includes('account')
        );
        
        if (accountRelatedFields.length > 0) {
          console.log(`\n⚠️ Found account-related fields: ${accountRelatedFields.join(', ')}`);
          accountRelatedFields.forEach(field => {
            console.log(`   ${field}:`, user[field]);
          });
        }
      }
      console.log('');
    }
    
    console.log('═════════════════════════════════════════\n');
    
    // Summary
    const usersWithAccounts = users.filter(u => u.accounts && u.accounts.length > 0).length;
    const usersWithoutAccounts = users.filter(u => !u.accounts || u.accounts.length === 0).length;
    
    console.log('=== SUMMARY ===');
    console.log(`✅ Users WITH accounts: ${usersWithAccounts}`);
    console.log(`❌ Users WITHOUT accounts: ${usersWithoutAccounts}`);
    console.log(`📊 Total users: ${users.length}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Check complete');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkUserAccounts();