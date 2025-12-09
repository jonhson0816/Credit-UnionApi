const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

const diagnoseTransactions = async () => {
  try {
    console.log('🔍 Starting diagnostic...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to database\n');
    
    // Get all transactions
    const allTransactions = await Transaction.find().limit(10).lean();
    console.log(`📊 Total transactions in database: ${await Transaction.countDocuments()}`);
    console.log(`📋 Showing first 10 transactions:\n`);
    
    for (const transaction of allTransactions) {
      console.log('─────────────────────────────────────────');
      console.log(`Transaction ID: ${transaction._id}`);
      console.log(`Description: ${transaction.description}`);
      console.log(`Amount: $${transaction.amount}`);
      console.log(`Type: ${transaction.type}`);
      console.log(`Category: ${transaction.category}`);
      console.log(`AccountId: ${transaction.accountId || 'MISSING!'}`);
      console.log(`AccountId Type: ${typeof transaction.accountId}`);
      console.log(`Source Account Number: ${transaction.sourceAccountNumber || 'N/A'}`);
      console.log(`Destination Account Number: ${transaction.destinationAccountNumber || 'N/A'}`);
      console.log(`User ID: ${transaction.userId}`);
      
      // Try to find the user and their accounts
      if (transaction.userId) {
        const user = await User.findById(transaction.userId).lean();
        if (user && user.accounts) {
          console.log(`\n👤 User has ${user.accounts.length} account(s):`);
          user.accounts.forEach((acc, idx) => {
            console.log(`   Account ${idx + 1}:`);
            console.log(`     - ID: ${acc._id}`);
            console.log(`     - Type: ${acc.accountType}`);
            console.log(`     - Number: ${acc.accountNumber}`);
            console.log(`     - Balance: $${acc.balance}`);
          });
          
          // Check if accountId matches any account
          if (transaction.accountId) {
            const matchedAccount = user.accounts.find(a => 
              a._id.toString() === transaction.accountId.toString()
            );
            if (matchedAccount) {
              console.log(`\n✅ AccountId MATCHES account: ${matchedAccount.accountNumber}`);
            } else {
              console.log(`\n❌ AccountId DOES NOT MATCH any account!`);
              console.log(`   Transaction accountId: ${transaction.accountId}`);
              console.log(`   Available account IDs: ${user.accounts.map(a => a._id.toString()).join(', ')}`);
            }
          }
          
          // Check if we can match by account number
          if (transaction.sourceAccountNumber) {
            const matchedByNumber = user.accounts.find(a => 
              a.accountNumber === transaction.sourceAccountNumber
            );
            if (matchedByNumber) {
              console.log(`\n✅ Can match by SOURCE account number: ${matchedByNumber.accountNumber} (ID: ${matchedByNumber._id})`);
            }
          }
        } else {
          console.log(`\n⚠️ User has NO accounts!`);
        }
      }
      console.log('');
    }
    
    console.log('─────────────────────────────────────────\n');
    
    // Summary
    const transactionsWithAccountId = await Transaction.countDocuments({ accountId: { $exists: true, $ne: null } });
    const transactionsWithoutAccountId = await Transaction.countDocuments({ $or: [{ accountId: null }, { accountId: { $exists: false } }] });
    
    console.log('=== SUMMARY ===');
    console.log(`✅ Transactions WITH accountId: ${transactionsWithAccountId}`);
    console.log(`❌ Transactions WITHOUT accountId: ${transactionsWithoutAccountId}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Diagnostic complete');
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
    process.exit(1);
  }
};

// Run the diagnostic
diagnoseTransactions();