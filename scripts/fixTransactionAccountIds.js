const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
require('dotenv').config();

const fixTransactionAccountIds = async () => {
  try {
    console.log('🔧 Starting transaction fix...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to database');
    
    // Get all transactions that are missing accountId
    const transactionsToFix = await Transaction.find({
      $or: [
        { accountId: null },
        { accountId: { $exists: false } }
      ]
    });
    
    console.log(`📊 Found ${transactionsToFix.length} transactions to fix`);
    
    let fixedCount = 0;
    let failedCount = 0;
    
    for (const transaction of transactionsToFix) {
      try {
        // Get the user
        const user = await User.findById(transaction.userId);
        
        if (!user || !user.accounts || user.accounts.length === 0) {
          console.log(`⚠️ No accounts found for user ${transaction.userId}`);
          failedCount++;
          continue;
        }
        
        // Find matching account by account number
        let matchedAccount = null;
        
        // Try sourceAccountNumber first
        if (transaction.sourceAccountNumber) {
          matchedAccount = user.accounts.find(acc => 
            acc.accountNumber === transaction.sourceAccountNumber
          );
        }
        
        // Try destinationAccountNumber if not found
        if (!matchedAccount && transaction.destinationAccountNumber) {
          matchedAccount = user.accounts.find(acc => 
            acc.accountNumber === transaction.destinationAccountNumber
          );
        }
        
        // Use first account as fallback
        if (!matchedAccount) {
          matchedAccount = user.accounts[0];
          console.log(`⚠️ Using first account as fallback for transaction ${transaction._id}`);
        }
        
        // Update the transaction with the correct accountId
        transaction.accountId = matchedAccount._id;
        await transaction.save();
        
        fixedCount++;
        console.log(`✅ Fixed transaction ${transaction._id} - linked to account ${matchedAccount.accountNumber}`);
        
      } catch (error) {
        console.error(`❌ Failed to fix transaction ${transaction._id}:`, error.message);
        failedCount++;
      }
    }
    
    console.log('\n=== FIX SUMMARY ===');
    console.log(`✅ Fixed: ${fixedCount} transactions`);
    console.log(`❌ Failed: ${failedCount} transactions`);
    console.log(`📊 Total processed: ${transactionsToFix.length} transactions`);
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
};

// Run the script
fixTransactionAccountIds();